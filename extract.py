#!/usr/bin/python
# -*- coding: utf-8 -*-

import optparse

import MySQLdb as mdb
import sys
reload(sys)
sys.setdefaultencoding('iso-8859-15')
import os.path
import re
re_latin1 = re.compile(r"[åäÅÄ]", re.IGNORECASE)
re_latin2 = re.compile(r"[öÖ]", re.IGNORECASE)
re_illigal = re.compile(r"[\[\]\\\/\?%:|\"'><#\s]", re.IGNORECASE)
re_markup = re.compile(r"\[.*?\]")

import HTMLParser
h = HTMLParser.HTMLParser()

from config import mysql

from PIL import Image

scriptdir = os.path.dirname(os.path.abspath(__file__))


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

    return vars(parser.parse_args()[0])

im = None
thumb = None


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

WHERE {0}parentId = %s;""".format(mysql['cp'], mysql['tp'])

missing_files = []
all_files = []

def decode(text):
    if text is None:
        return ""
    return text.encode("iso-8859-15","ignore")


def generate_html(fname, grandchildren, itemtype):
    html = "<html><body>"
    for grandchild in grandchildren:
        pathcomponent = grandchild[0]
        title = grandchild[1]
        if grandchild[2] == 'GalleryAlbumItem':
            thumbcomponent = 'album.jpg'
        else:
            thumbcomponent = pathcomponent

        html += "<div class='object'><a href='./{0}'><img src='./t__{1}' class='thumbnail'/><div class='title'>{2}</div></a></div>".format(pathcomponent, thumbcomponent, title)
    html += "</body></html>"

    with open(fname, 'w') as f:
        f.write(html)

def get_children(id, fspath, uipath, depth):
    sys.stdout.write(">")
    global im
    global thumb

    cur.execute(SQLgetChildren, (id,));
    rows = cur.fetchall()

    child_objects = [];
    for row in rows:
        itemid = row[0]
        itemtype = decode(row[1])
        children = row[2]

        pathcomponent = decode(row[5])
        title = re_markup.sub("", decode(row[3])).replace('\00','')
        if not title:
            title = pathcomponent
        if not title:
            title = "notitle"

        a=title
        uipathcomponent = (title or pathcomponent).lower()
        b = uipathcomponent
        # replace latin1 stuff fast
        uipathcomponent = uipathcomponent.replace("&auml;", "a")
        c = uipathcomponent
        uipathcomponent = uipathcomponent.replace("&aring;", "a")
        d = uipathcomponent
        uipathcomponent = uipathcomponent.replace("&ouml;", "o")
        e = uipathcomponent
        # remove illigal filepath chars
        uipathcomponent = re_illigal.sub("_", uipathcomponent)
        f = uipathcomponent
        # remove sillyness
        uipathcomponent = uipathcomponent.replace("__","_").replace("_-_","-")
        g = uipathcomponent

        if itemtype == 'GalleryAlbumItem' and children == 1:
            child_objects.append((uipathcomponent, title, itemtype))

            fspath.append(pathcomponent);

            uipath.append( uipathcomponent );
            mkpath = os.path.join(scriptdir, "test", ('/'.join(uipath))[1:])
            if not os.path.exists(mkpath) and not options['dry_run']:
                os.makedirs(mkpath)
                sys.stdout.write('A')

            # traverse deeper into the structure if there's childen
            grandchildren = get_children(itemid, fspath, uipath, depth+1);

            if not grandchildren:
                sys.stdout.write('a')
                # print "empty:", ('/'.join(uipath))[1:]
            elif not options['dry_run']:
                fname = os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], "index.html")
                generate_html(fname, grandchildren, itemtype)

            fspath.pop()
            uipath.pop()
        elif itemtype == 'GalleryPhotoItem':
            child_objects.append((pathcomponent, title, itemtype))
            if not options['dry_run']:
                orig_file = os.path.join(scriptdir, "gall", ('/'.join(fspath))[1:], pathcomponent)
                link_target = os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], uipathcomponent) + '.jpg'
                thumb_target = os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], 't__' + uipathcomponent) + '.jpg'
                album_target = os.path.join(scriptdir, "test", ('/'.join(uipath))[1:], 't__album.jpg') + '.jpg'

                try:
                    e = os.path.isfile(orig_file)
                except Exception, e:
                    print ""
                    print "orig_file"
                    print e.__class__.__name__, e
                    print orig_file
                    sys.exit(1)
                try:
                    t = os.path.exists(thumb_target)
                except Exception, e:
                    print ""
                    print e.__class__.__name__, e
                    print "row[3]", row[3]
                    print "row[5]", row[5]
                    print "title", title
                    print "pathcomponent", pathcomponent
                    print "thumb_target", thumb_target
                    print "link_target", link_target
                    print "orig_file", orig_file
                    print "uipathcomponent", uipathcomponent
                    print "--"
                    print "a", a
                    print "A", ' '.join(('x'+str(ord(c))+' ' for c in a.replace('\00','')))
                    print "bool(a)", bool(a.replace('\00',''))
                    print "b", b
                    print "c", c
                    print "d", d
                    print "e", e
                    print "f", f
                    print "g", g
                    sys.exit(1)

                if not e:
                    missing_files.append(orig_file)
                    sys.stdout.write('-')
                else:
                    if (not os.path.exists(thumb_target) and not options['no_thumbs']) or options['force_thumbs']:
                        try:
                            im = Image.open(orig_file)
                            thumb = cropped_thumbnail(im, (150,150))
                            thumb.save(thumb_target, "JPEG")
                            if itemid == rows[0][0] and not os.path.exists(album_target):
                                thumb.save(album_target, "JPEG")
                            sys.stdout.write('T')
                        except Exception, e:
                            sys.stdout.write('Y')
                    else:
                        sys.stdout.write('t')
                    if not os.path.exists(link_target):
                        try:
                            os.symlink(orig_file, link_target)
                            sys.stdout.write('L')
                        except Exception, e:
                            print ""
                            print e.__class__.__name__, e
                            print (os.path.exists(link_target)), orig_file, "->", link_target
                            sys.exit(1)
                    else:
                        sys.stdout.write('l')

            # create image html page
        else:
            #print itemtype, fspath, pathcomponent
            pass

    return child_objects


try:
    options = parse_options()

    con = mdb.connect(mysql['hostname'], mysql['username'], mysql['password'], mysql['database']);
    cur = con.cursor()

    fname = os.path.join(scriptdir, "test", "index.html")
    generate_html(fname, get_children(7, [''], [''], 0), "GalleryAlbumItem");

    print ""
    print "missing", len(missing_files)
    print "total count", len(all_files)


except mdb.Error, e:

    print "Error %d: %s" % (e.args[0],e.args[1])
    sys.exit(1)

finally:

    if con:
        con.close()
