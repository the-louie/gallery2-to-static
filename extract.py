#!/usr/bin/python
# -*- coding: utf-8 -*-

import HTMLParser
import MySQLdb as mdb
from PIL import Image
from config import mysql_cfg, file_cfg
import optparse
import os.path
import re
import sys
from unidecode import unidecode

# Set default encoding
reload(sys)
sys.setdefaultencoding('iso-8859-15')

# Create HTML parser
HTML_PARSER = HTMLParser.HTMLParser()

# Setup regex for pathcomponent cleaning
RE_ILLIGAL = re.compile(r'[\[\]\\\/\?%:|"\'><#\s&]', re.IGNORECASE)
RE_MARKUP = re.compile(r'\[.*?\]')

# setup default thumb_prefix is none set
if not file_cfg['thumb_prefix']:
    file_cfg['thumb_prefix'] = 't__'

# Get root dir
SCRIPTDIR = os.path.dirname(os.path.abspath(__file__))

DEBUG = False

# CSS to apply
STYLE = '''
body {
        background: #000;
        color: #fff;
        font-size: 0.8em;
        font-family: Arial;
}
a {
        color: #fff;
}
div.object {
        padding: 10px;
        width: 170px;
        float: left;
}
img.thumbnail {
        width: 150px;
        height: 150px;
}
div.title {
        width: 150px;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0;
        margin: 0;
}
'''


# cli options
def parse_options():
    'Extract options from command line.'
    parser = optparse.OptionParser()
    parser.add_option(
        '-s',
        '--source-path',
        type='string',
        dest='source_path',
        help='''Path to the full size
images from Gallery 2 (probably g2data/albums)''',
        default=''
    )

    parser.add_option(
        '-d',
        '--debug',
        action='store_true',
        dest='debug',
        help='Debug mode',
        default=False
    )

    parser.add_option(
        '--dry-run',
        action='store_true',
        dest='dry_run',
        default=False
    )

    parser.add_option(
        '--force-thumbs',
        action='store_true',
        dest='force_thumbs',
        default=False
    )

    parser.add_option(
        '--no-thumbs',
        action='store_true',
        dest='no_thumbs',
        default=False
    )

    parser.add_option(
        '--ignore-albums',
        dest='ignore_albums',
        default=''
    )

    parser.add_option(
        '--only-albums',
        dest='only_albums',
        default=''
    )

    return vars(parser.parse_args()[0])

OPTIONS = parse_options()


# Ignore albums
OPT_IGNALB = []
if OPTIONS.get('ignore_albums', '') != '':
    OPT_IGNALB = OPTIONS.get('ignore_albums').split(',')
    OPT_IGNALB = filter(None, OPT_IGNALB)


# Only albums
OPT_ONLALB = []
if OPTIONS.get('only_albums', '') != '':
    OPT_ONLALB = OPTIONS.get('only_albums').split(',')
    OPT_ONLALB = filter(None, OPT_ONLALB)


# im = None
# thumb = None

def log(text):
    'Debug print'
    if DEBUG:
        sys.stdout.write(text)


def flat(*nums):
    '''
       Build a tuple of ints from float or integer arguments. Useful
       because PIL crop and resize require integer points.
    '''
    return tuple(int(round(n)) for n in nums)


class Size(object):
    'Helper class to calculate properties of image dimension'
    def __init__(self, pair):
        self.width = float(pair[0])
        self.height = float(pair[1])

    @property
    def aspect_ratio(self):
        'Ration between Width and Height.'
        return self.width / self.height

    @property
    def size(self):
        'Width, Size'
        return flat(self.width, self.height)


def cropped_thumbnail(img, size):
    '''
    Builds a thumbnail by cropping out a maximal region from the center of the
    original with the same aspect ratio as the target size, and then resizing.
    The result is a thumbnail which is always EXACTLY the requested size and
    with no aspect ratio distortion (although two edges, either top/bottom or
    left/right depending whether the image is too tall or too wide, may be
    trimmed off.)
    '''

    original = Size(img.size)
    target = Size(size)

    if target.aspect_ratio > original.aspect_ratio:
        # image is too tall: take some off the top and bottom
        scale_factor = target.width / original.width
        crop_size = Size((original.width, target.height / scale_factor))
        top_cut_line = (original.height - crop_size.height) / 2
        img = img.crop(
            flat(0,
                 top_cut_line,
                 crop_size.width,
                 top_cut_line + crop_size.height))
    elif target.aspect_ratio < original.aspect_ratio:
        # image is too wide: take some off the sides
        scale_factor = target.height / original.height
        crop_size = Size((target.width/scale_factor, original.height))
        side_cut_line = (original.width - crop_size.width) / 2
        img = img.crop(
            flat(side_cut_line,
                 0,
                 side_cut_line + crop_size.width,
                 crop_size.height))

    return img.resize(target.size, Image.ANTIALIAS)


SQL_GET_CHILDREN = '''
SELECT
    ce.{0}id as id,    -- main id
    e.{0}entityType as type,
    i.{0}canContainChildren as children,

    i.{0}title as title,
    i.{0}description as description,

    fse.{0}pathComponent as pathcomponent,
    i.{0}originationTimestamp as timestamp,

    pi.{0}width as width,
    pi.{0}height as height,

    di.{0}width as thumb_width,
    di.{0}height as thumb_height


-- relations table
FROM {1}ChildEntity ce

-- master table
LEFT JOIN {1}Entity e ON e.{0}id=ce.{0}id

-- item information
LEFT JOIN {1}Item i ON i.{0}id=ce.{0}id

-- file system information
LEFT JOIN {1}FileSystemEntity fse ON fse.{0}id = ce.{0}id

-- photo-info
LEFT JOIN {1}PhotoItem pi ON pi.{0}id=ce.{0}id

-- thumbinfo
LEFT JOIN {1}DerivativeImage di on di.{0}id = ce.{0}id

WHERE {0}parentId = %s;
'''.format(mysql_cfg['cp'], mysql_cfg['tp'])

missing_files = []  # pylint: disable=C0103
all_files = []  # pylint: disable=C0103


def decode(text):
    'Convert non-ASCII chars to more readable ones, for url and filesystem'
    if text is None:
        return ''
    return unidecode(unicode(text)).encode('iso-8859-15')


def generate_html(html_filename, html_grandchildren, pathcomponent):
    if os.path.isfile(html_filename):
        print '---', html_filename
        return
    html = '''
<html><head>
<link rel="stylesheet" type="text/css" href="/style.css">
</head><body>'''

    if pathcomponent:
        html += '<div class="parent"><a href="..">back</a></div>'
    html += '<div class="content">'

    for grandchild in html_grandchildren:
        pathcomponent = grandchild[0].lower()
        title = cleanup_uipathcomponent(grandchild[1])
        if grandchild[2] == 'GalleryAlbumItem':
            thumbcomponent = 'album.jpg'
            html += '''
<div class="object">
    <a href="./{0}"><img src="./{0}/{1}{2}" class="thumbnail"/>
    <div class="title">{3}</div></a>
</div>'''.format(
                pathcomponent,
                file_cfg['thumb_prefix'],
                thumbcomponent,
                title)
        else:
            thumb_target = get_thumb_target('',
                                            title,
                                            pathcomponent,
                                            False)
            link_target = get_link_target('',
                                          title,
                                          pathcomponent,
                                          False)
            html += '''
<div class="object">
<a href="./{0}"><img src="./{1}" class="thumbnail"/>
<div class="title">{2}</div></a>
</div>'''.format(link_target, thumb_target, title)

    html += "</div></body></html>"

    with open(html_filename, 'w') as filed:
        print '+++', html_filename
        filed.write(html)


def get_extention(filename):
    'Returns the extension of a filename, the part after the last dot.'
    return filename[(filename.rfind('.')+1):]


def get_link_target(uipath,
                    uipathcomponent,
                    pathcomponent='',
                    full_path=False):
    'Create a filename for the link that points to the real image.'
    if pathcomponent and uipathcomponent.lower() != pathcomponent.lower():
        new_pathcomponent = '___' + pathcomponent
    else:
        new_pathcomponent = ''

    # FIXME: Ugly workaround for double extentions .jpg.jpg
    file_name = (uipathcomponent + new_pathcomponent + '.jpg')
    file_name = file_name.lower().replace('.jpg.jpg', '.jpg')
    if full_path:
        return (os.path.join(
                SCRIPTDIR,
                'test',
                ('/'.join(uipath))[1:],
                file_name)).lower()
    else:
        return file_name


def get_thumb_target(uipath,
                     uipathcomponent,
                     pathcomponent='',
                     full_path=False):
    'Create a filename for the thumbnail image.'
    if pathcomponent:
        pathcomponent = '___' + pathcomponent

    # FIXME: Ugly workaround for double extentions (.jpg.jpg)
    file_name = file_cfg['thumb_prefix'] + uipathcomponent + pathcomponent
    file_name = (file_name + '.jpg').lower().replace('.jpg.jpg', '.jpg')
    if full_path:
        return (os.path.join(
                SCRIPTDIR,
                'test',
                ('/'.join(uipath))[1:],
                file_name)).lower()
    else:
        return file_name


def generate_album(itemid, fspath, uipath, depth, pathcomponent):
    'Get all the children and create the HTML for index.html.'
    mkpath = os.path.join(SCRIPTDIR, 'test', ('/'.join(uipath))[1:])
    if not os.path.exists(mkpath) and not OPTIONS.get('dry_run', False):
        os.makedirs(mkpath)

    # traverse deeper into the structure if there's childen
    grandchildren = get_children(itemid, fspath, uipath, depth+1)

    if grandchildren and not OPTIONS.get('dry_run', False):
        fname = os.path.join(SCRIPTDIR,
                             'test',
                             ('/'.join(uipath))[1:],
                             'index.html')
        log('\n')
        generate_html(fname, grandchildren, pathcomponent)

    return grandchildren


def generate_content(fspath,
                     uipath,
                     uipathcomponent,
                     pathcomponent,
                     firstimage):
    '''
    For the current image create a thumbnail and a link to the
    original image.
    '''
    if not OPTIONS.get('dry_run', False):
        orig_file = os.path.join(SCRIPTDIR,
                                 'gall',
                                 ('/'.join(fspath))[1:],
                                 pathcomponent)
        link_target = get_link_target(uipath,
                                      uipathcomponent,
                                      pathcomponent,
                                      True)
        thumb_target = get_thumb_target(uipath,
                                        uipathcomponent,
                                        pathcomponent,
                                        True)

        # FIXME: Ugly workaround for double extentions
        album_target = (os.path.join(SCRIPTDIR,
                                     'test',
                                     ('/'.join(uipath))[1:],
                                     file_cfg['thumb_prefix'] + 'album.jpg'))
        album_target = album_target.lower().replace('.jpg.jpg', '.jpg')

        if not os.path.isfile(orig_file):
            missing_files.append(orig_file)
        else:
            if ((not os.path.exists(thumb_target) and
                    not OPTIONS.get('no_thumbs', False)) or
                    OPTIONS.get('force_thumbs', False)):
                try:
                    orig_image = Image.open(orig_file)
                    thumb = cropped_thumbnail(orig_image, (150, 150))
                    thumb.save(thumb_target, 'JPEG')
                    # if it's the first item make it the thumb for the album.
                    if firstimage and (os.path.islink(album_target) or
                                       not os.path.exists(album_target)):
                        if os.path.islink(album_target):
                            os.remove(album_target)
                        thumb.save(album_target, 'JPEG')
                    log('T')

                except Exception, exception:
                    missing_files.append(orig_file)
                    print '{0} {1} {2}'.format(
                            exception.__class__.__name__,
                            exception,
                            orig_file)
                    return False
            else:
                log('t')

            if not os.path.exists(link_target):
                try:
                    os.symlink(orig_file, link_target)
                    all_files.append(orig_file)
                    log('L')
                except Exception, exception:
                    print '{0} {1} {2} -> {3}'.format(
                            exception.__class__.__name__,
                            exception,
                            orig_file,
                            link_target)
                    sys.exit(1)
            else:
                log('l')

    return True


def cleanup_uipathcomponent(uipathcomponent):
    '''
    Clean up the directory and file names readable in the URL
    and filesystem.
    '''
    uipathcomponent = decode(uipathcomponent.replace('\00', ''))
    uipathcomponent = RE_MARKUP.sub('', uipathcomponent)

    # incremental html entities decode
    prev_uipathcomponent = ''
    while prev_uipathcomponent != uipathcomponent:
        prev_uipathcomponent = uipathcomponent
        uipathcomponent = HTML_PARSER.unescape(uipathcomponent)

    # remove illigal filepath chars
    uipathcomponent = RE_ILLIGAL.sub('_', uipathcomponent)

    # remove dash sillyness
    uipathcomponent = uipathcomponent.replace('__', '_').replace('_-_', '-')

    return decode(uipathcomponent).lower()


def get_children(itemid, fspath, uipath, depth):
    'Return all children for the specified id.'
    CUR.execute(SQL_GET_CHILDREN, (itemid,))
    rows = CUR.fetchall()

    child_objects = []
    first_image = True
    for row in rows:
        itemid = row[0]
        itemtype = decode(row[1])
        has_children = row[2]

        if not (itemtype == 'GalleryAlbumItem' and
                has_children == 1) and not (itemtype == 'GalleryPhotoItem'):
            continue

        # get sql result
        title = cleanup_uipathcomponent(row[3] or row[5])
        pathcomponent = decode(row[5])

        if itemtype == 'GalleryAlbumItem' and has_children == 1:
            if pathcomponent in OPT_IGNALB or title in OPT_IGNALB:
                print '***', pathcomponent
                continue
            if OPT_ONLALB and pathcomponent not in OPT_ONLALB:
                print '+++', pathcomponent
                continue

            child_objects.append((title, title, itemtype))

            fspath.append(pathcomponent)
            uipath.append(title)

            generate_album(itemid,
                           fspath,
                           uipath,
                           depth,
                           pathcomponent)
            tmp_uipath = uipath[:]  # clone uipath

            fspath.pop()
            uipath.pop()
            try:
                link_target = os.path.join(SCRIPTDIR,
                                           'test',
                                           ('/'.join(tmp_uipath))[1:],
                                           file_cfg['thumb_prefix'] +
                                           'album.jpg')
                link_source = os.path.join(SCRIPTDIR,
                                           'test',
                                           ('/'.join(tmp_uipath[:-1]))[1:],
                                           file_cfg['thumb_prefix'] +
                                           'album.jpg')
                if (not os.path.exists(link_source) and
                        os.path.exists(link_target)):
                    os.symlink(link_target, link_source)
            except OSError:
                pass

        elif itemtype == 'GalleryPhotoItem':
            if generate_content(fspath,
                                uipath,
                                title,
                                pathcomponent,
                                first_image):
                child_objects.append((pathcomponent, title, itemtype))
                first_image = False

    return child_objects


def main():
    with open(os.path.join(SCRIPTDIR, 'test', 'style.css'), 'w') as filed:
        filed.write(STYLE)

    fname = os.path.join(SCRIPTDIR, 'test', 'index.html')
    grandchildren = get_children(7, [''], [''], 0)
    generate_html(fname, grandchildren, '')

    print ''
    print 'missing', len(missing_files)
    print 'total count', len(all_files)

CON = None
try:

    CON = mdb.connect(mysql_cfg['hostname'],
                      mysql_cfg['username'],
                      mysql_cfg['password'],
                      mysql_cfg['database'])
    CUR = CON.cursor()



    # generate root album
    main()



except mdb.Error, exception:
    print 'Error {0}: {1}'.format(exception.args[0], exception.args[1])
    sys.exit(1)

finally:
    if CON:
        CON.close()
