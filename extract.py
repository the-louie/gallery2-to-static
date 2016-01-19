#!/usr/bin/python
# -*- coding: utf-8 -*-

import MySQLdb as mdb
import sys
reload(sys)
sys.setdefaultencoding('iso-8859-15')
import os.path
import re
re_illigal = re.compile(r"[\[\]\\\/\?%:|\"'><#\s]", re.IGNORECASE)
re_markup = re.compile(r"\[.*?\]")

import HTMLParser
h = HTMLParser.HTMLParser()

from config import mysql

dryrun = False

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
        return None
    return text.encode("iso-8859-15","ignore")


def generate_html(fname, grandchildren):
    html = "<html><body>"
    for grandchild in grandchildren:
        html += "<a href='./{0}'>{1}</a><br/>".format(grandchild[0], grandchild[1])
    html += "</body></html>"

    with open(fname, 'w') as f:
        f.write(html)

def get_children(id, fspath, uipath, depth):
    cur.execute(SQLgetChildren, (id,));
    rows = cur.fetchall()

    child_objects = [];
    for row in rows:
        itemid = row[0]
        itemtype = decode(row[1])
        children = row[2]

        pathcomponent = decode(row[5])
        title =re_markup.sub("", decode(row[3] or pathcomponent or "NoTitle"))
        uipathcomponent = re_illigal.sub("_", h.unescape(title)).replace("__", "_").replace("_-_", "-").lower()



        # if pathcomponent is None:
        #     print itemtype, children
        # else:
        #     print pathcomponent, fspath
        if itemtype == 'GalleryAlbumItem' and children == 1:
            child_objects.append((uipathcomponent, title,))

            fspath.append(pathcomponent);

            uipath.append( uipathcomponent );
            mkpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test", ('/'.join(uipath))[1:])
            if not os.path.exists(mkpath) and not dryrun:
                os.makedirs(mkpath)

            # traverse deeper into the structure if there's childen
            grandchildren = get_children(itemid, fspath, uipath, depth+1);

            # create album html
            #
            if not grandchildren:
                print "empty:", ('/'.join(uipath))[1:]
            elif not dryrun:
                fname = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test", ('/'.join(uipath))[1:], "index.html")
                generate_html(fname, grandchildren)

            fspath.pop()
            uipath.pop()
        elif itemtype == 'GalleryPhotoItem':
            child_objects.append((pathcomponent, title,))
            if not dryrun:
                p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gall", ('/'.join(fspath))[1:], pathcomponent)
                t = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test", ('/'.join(uipath))[1:], pathcomponent)

                e = os.path.isfile(p)
                if not e:
                    missing_files.append(p)
                elif not os.path.exists(t):
                    os.symlink(p, t)



            # create image html page
        else:
            #print itemtype, fspath, pathcomponent
            pass

    return child_objects


try:
    con = mdb.connect(mysql['hostname'], mysql['username'], mysql['password'], mysql['database']);

    cur = con.cursor()

    fname = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test", "index.html")
    generate_html(fname, get_children(7, [''], [''], 0));

    print ""
    print "missing", len(missing_files)
    print "total count", len(all_files)


except mdb.Error, e:

    print "Error %d: %s" % (e.args[0],e.args[1])
    sys.exit(1)

finally:

    if con:
        con.close()
