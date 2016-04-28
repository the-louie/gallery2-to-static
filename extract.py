#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
    WARNING: This is work in progress, and will need to get a major refactor before it's readable.
"""

import optparse

import MySQLdb as mdb
import sys
reload(sys)
sys.setdefaultencoding('iso-8859-15')
import os.path
import re
from unidecode import unidecode
import HTMLParser
html_parser = HTMLParser.HTMLParser()

re_latin1 = re.compile(r"[åäÅÄ]", re.IGNORECASE)
re_latin2 = re.compile(r"[öÖ]", re.IGNORECASE)
re_illigal = re.compile(r"[\[\]\\\/\?%:|\"'><#\s&]", re.IGNORECASE)
re_markup = re.compile(r"\[.*?\]")
re_htmlentity = re.compile(r"&[^;]+;", re.IGNORECASE)

import HTMLParser
h = HTMLParser.HTMLParser()

from config import mysql_cfg, file_cfg
if not file_cfg['thumb_prefix']:
    file_cfg['thumb_prefix'] = 't__'

from PIL import Image

scriptdir = os.path.dirname(os.path.abspath(__file__))

log = False

style = """
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
"""

# cli options
def parse_options():
    parser = optparse.OptionParser()
    parser.add_option(
        '-s',
        '--source-path',
        type='string',
        dest='source_path',
        help="Path to the full size images from Gallery 2 (probably g2data/albums)",
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

im = None
thumb = None

def w(text):
    sys.stdout.write(text)

def flat( *nums ):
    'Build a tuple of ints from float or integer arguments. Useful because PIL crop and resize require integer points.'
    return tuple( int(round(n)) for n in nums )

class Size(object):
    def __init__(self, pair):
        self.width = float(pair[0])
        self.height = float(pair[1])

    @property
    def aspect_ratio(self):
        return self.width / self.height

    @property
    def size(self):
        return flat(self.width, self.height)

def cropped_thumbnail(img, size):
    '''
    Builds a thumbnail by cropping out a maximal region from the center of the original with
    the same aspect ratio as the target size, and then resizing. The result is a thumbnail which is
    always EXACTLY the requested size and with no aspect ratio distortion (although two edges, either
    top/bottom or left/right depending whether the image is too tall or too wide, may be trimmed off.)
    '''

    original = Size(img.size)
    target = Size(size)

    if target.aspect_ratio > original.aspect_ratio:
        # image is too tall: take some off the top and bottom
        scale_factor = target.width / original.width
        crop_size = Size( (original.width, target.height / scale_factor) )
        top_cut_line = (original.height - crop_size.height) / 2
        img = img.crop( flat(0, top_cut_line, crop_size.width, top_cut_line + crop_size.height) )
    elif target.aspect_ratio < original.aspect_ratio:
        # image is too wide: take some off the sides
        scale_factor = target.height / original.height
        crop_size = Size( (target.width/scale_factor, original.height) )
        side_cut_line = (original.width - crop_size.width) / 2
        img = img.crop( flat(side_cut_line, 0,  side_cut_line + crop_size.width, crop_size.height) )

    return img.resize(target.size, Image.ANTIALIAS)


SQLgetChildren = """SELECT
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

WHERE {0}parentId = %s;""".format(mysql_cfg['cp'], mysql_cfg['tp'])

missing_files = []
all_files = []

def decode(text):
    if text is None:
        return ""
    return unidecode(unicode(text)).encode("iso-8859-15")

def generate_html(fname, grandchildren, itemtype, pathcomponent):
    if os.path.isfile(fname):
        print "---", fname
        return
    html = "<html><head><link rel='stylesheet' type='text/css' href='/style.css'></head><body>"
    if pathcomponent:
        html += "<div class='parent'><a href='..'>back</a></div>"
    html += "<div class='content'>"

    for grandchild in grandchildren:
        # FIXME: grandchild[0] == grandchilde[1]
        pathcomponent = grandchild[0].lower()
        title = grandchild[1]
        if grandchild[2] == 'GalleryAlbumItem':
            thumbcomponent = 'album.jpg'
            html += "<div class='object'><a href='./{0}'><img src='./{0}/{1}{2}' class='thumbnail'/><div class='title'>{3}</div></a></div>".format(pathcomponent, file_cfg['thumb_prefix'], thumbcomponent, title)
        else:
            thumb_target = get_thumb_target('', cleanup_uipathcomponent(title), pathcomponent, False)
            link_target = get_link_target('', cleanup_uipathcomponent(title), pathcomponent, False)
            html += "<div class='object'><a href='./{0}'><img src='./{1}' class='thumbnail'/><div class='title'>{2}</div></a></div>".format(link_target, thumb_target, title)

    html += "</div></body></html>"

    with open(fname, 'w') as f:
        print "+++", fname
        f.write(html)

def get_extention(filename):
    return filename[(filename.rfind(".")+1):]

def get_link_target(uipath, uipathcomponent, pathcomponent = '', full_path = False):
    if pathcomponent and uipathcomponent.lower() != pathcomponent.lower():
        new_pathcomponent = '___' + pathcomponent
    else:
        new_pathcomponent = ''
    file_name = (uipathcomponent + new_pathcomponent + '.jpg').lower().replace('.jpg.jpg','.jpg') # FIXME: Ugly workaround for double extentions
    if full_path:
        return (os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], file_name)).lower()
    else:
        return file_name

def get_thumb_target(uipath, uipathcomponent, pathcomponent = '', full_path = False):
    if pathcomponent:
        pathcomponent = '___' + pathcomponent
    file_name = (file_cfg['thumb_prefix'] + uipathcomponent + pathcomponent + '.jpg').lower().replace('.jpg.jpg','.jpg') # FIXME: Ugly workaround for double extentions
    if full_path:
        return (os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], file_name)).lower()
    else:
        return file_name

def generate_album(itemid, fspath, uipath, depth, itemtype, pathcomponent):
    mkpath = os.path.join(scriptdir, "test", ('/'.join(uipath))[1:])
    if not os.path.exists(mkpath) and not options['dry_run']:
        os.makedirs(mkpath)


    # traverse deeper into the structure if there's childen
    grandchildren = get_children(itemid, fspath, uipath, depth+1);

    if grandchildren and not options['dry_run']:
        fname = os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], "index.html")
        w('\n')
        generate_html(fname, grandchildren, itemtype, pathcomponent)

    return grandchildren

def generate_content(itemid, fspath, uipath, uipathcomponent, pathcomponent, firstimage):
    if not options['dry_run']:
        orig_file = os.path.join(scriptdir, "gall", ('/'.join(fspath))[1:], pathcomponent)
        link_target = get_link_target(uipath, uipathcomponent, pathcomponent, True)
        thumb_target = get_thumb_target(uipath, uipathcomponent, pathcomponent, True)
        album_target = (os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], file_cfg['thumb_prefix'] + 'album.jpg')).lower().replace('.jpg.jpg','.jpg') # FIXME: Ugly workaround for double extentions

        if not os.path.isfile(orig_file):
            missing_files.append(orig_file)
        else:
            if (not os.path.exists(thumb_target) and not options['no_thumbs']) or options['force_thumbs']:
                try:
                    im = Image.open(orig_file)
                    thumb = cropped_thumbnail(im, (150,150))
                    thumb.save(thumb_target, "JPEG")
                    # if it's the first item make it the thumb for the album.
                    if firstimage and (os.path.islink(album_target) or not os.path.exists(album_target)):
                        if os.path.islink(album_target):
                            os.remove(album_target)
                        thumb.save(album_target, "JPEG")
                    w('T')

                except Exception, e:
                    sys.stderr.write(str(e.__class__.__name__) + str(e) + orig_file + "\n")
                    return False
            else:
                w('t')

            if not os.path.exists(link_target):
                try:
                    os.symlink(orig_file, link_target)
                    w('L')
                except Exception, e:
                    print e.__class__.__name__, e, orig_file, "->", link_target
                    sys.exit(1)
            else:
                w('l')

    return True

def cleanup_uipathcomponent(uipathcomponent):
    uipathcomponent = decode(uipathcomponent.replace('\00',''))
    uipathcomponent = re_markup.sub("", uipathcomponent)

    # incremental html entities decode
    prev_uipathcomponent = ""
    while prev_uipathcomponent != uipathcomponent:
        prev_uipathcomponent = uipathcomponent
        uipathcomponent = html_parser.unescape(uipathcomponent)

    # remove illigal filepath chars
    uipathcomponent = re_illigal.sub("_", uipathcomponent)

    # remove dash sillyness
    uipathcomponent = uipathcomponent.replace("__","_").replace("_-_","-")

    return decode(uipathcomponent).lower()

def get_children(id, fspath, uipath, depth):
    cur.execute(SQLgetChildren, (id,));
    rows = cur.fetchall()

    child_objects = [];
    first_image = True
    for row in rows:
        itemid = row[0]
        itemtype = decode(row[1])
        has_children = row[2]

        if not (itemtype == 'GalleryAlbumItem' and has_children == 1) and not (itemtype == 'GalleryPhotoItem'):
            continue

        # get sql result
        title = cleanup_uipathcomponent(row[3] or row[5])
        pathcomponent = decode(row[5])

        if itemtype == 'GalleryAlbumItem' and has_children == 1:
            if pathcomponent in ignore_albums or title in ignore_albums:
                print "***", pathcomponent
                continue
            if only_albums and pathcomponent not in only_albums:
                print "+++", pathcomponent
                continue

            child_objects.append((title, title, itemtype))

            fspath.append(pathcomponent);
            uipath.append(title);

            generate_album(itemid, fspath, uipath, depth, itemtype, pathcomponent)
            tmp_uipath = uipath[:] # clone uipath

            fspath.pop()
            uipath.pop()
            try:
                link_target = os.path.join(scriptdir, "test",('/'.join(tmp_uipath))[1:], file_cfg['thumb_prefix'] + 'album.jpg')
                link_source = os.path.join(scriptdir, "test",('/'.join(tmp_uipath[:-1]))[1:], file_cfg['thumb_prefix'] + 'album.jpg')
                if not os.path.exists(link_source) and os.path.exists(link_target):
                    os.symlink(link_target, link_source)
            except OSError, e:
                pass

        elif itemtype == 'GalleryPhotoItem':
            if generate_content(itemid, fspath, uipath, title, pathcomponent, first_image):
                child_objects.append((pathcomponent, title, itemtype))
                first_image = False


    return child_objects

con = None
try:
    options = parse_options()
    ignore_albums = []
    if options['ignore_albums'] != '':
        ignore_albums = options['ignore_albums'].split(',')
        ignore_albums = filter(None, ignore_albums)

    only_albums = []
    if options['only_albums'] != '':
        only_albums = options['only_albums'].split(',')
        only_albums = filter(None, only_albums)

    con = mdb.connect(mysql_cfg['hostname'], mysql_cfg['username'], mysql_cfg['password'], mysql_cfg['database']);
    cur = con.cursor()

    with open(os.path.join(scriptdir, "test", 'style.css'), 'w') as f:
        f.write(style)

    # generate root album
    fname = os.path.join(scriptdir, "test", "index.html")
    grandchildren = get_children(7, [''], [''], 0)
    generate_html(fname, grandchildren, "GalleryAlbumItem", '');


    print ""
    print "missing", len(missing_files)
    print "total count", len(all_files)


except mdb.Error, e:
    print "Error %d: %s" % (e.args[0],e.args[1])
    sys.exit(1)

finally:
    if con:
        con.close()
