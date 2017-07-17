//  This module scans a parsed Gedcom tree and lists all individuals, having more than one child
// where a descendant of one child married a descendant of another.
// It lists the name of the common ancestor and the names of the marrying couple.
// This way we get only the youngest common ancestor of a related couple.
// We ignore parent/child relationships that are not natural

mInd = require('./tree/individuals.js');
mFam = require('./tree/families.js');

var inds = mInd.individuals;
var fams = mFam.families;

function display (title,ind) {
    var str = title +' id: '+ind.id;
    if (ind.name) {
        str += (', '+ind.name);
    }
    if (ind.birth) {
        str += (', birth: '+ind.birth);
    }
    if (ind.death) {
        str += (', death: '+ind.death);
    }
    return str;
}

function traverse (current,common, head,graph,path) {
    // find out if current person and any of his/her spouses share the common ancestor
    current.pathLinks = path.map(function(p) {
        return p.id;
    });
    current.spouses.forEach(function(s) {
        if (graph[s]) {
            if (graph[s].ancestor &&  (graph[s].ancestor !== head.id)) {
                console.log('');
                if (common.husband) {
                    console.log(display('Common father', simple[common.husband]));
                }
                if (common.wife) {
                    console.log(display('Common mother', simple[common.wife]));
                }
                console.log(display('First ancestor',head));
                console.log(display('Second ancestor',graph[graph[s].ancestor]));
                console.log(display('First spouse',current));
                console.log(display('Second spouse',graph[s]));
                console.log('First path');
                while (current.pathLinks.length) {
                    console.log(display('  ',graph[current.pathLinks.pop()]));
                }
                console.log('Second path:');
                while (graph[s].pathLinks.length) {
                    console.log(display('  ',graph[graph[s].pathLinks.pop()]));
                }
                loopCnt++;
            }
        }
    });
    var t;
    if (current.ancestor){
        t = path.pop();
        return; // already been here, abort this path
    }
    current.ancestor = head.id; // set visited mark to current person's main ancestor (child of common ancestor)
    current.children.forEach(function(c) {
        if (graph[c]) { // is it a real child
            var childPath = path;
            childPath.push(graph[c]);
             traverse(graph[c],common, head,graph,childPath);
        }
    });
    t = path.pop();
}

// first we build a simplified graph of all individuals containing arches to their spouses  and to their natural children

var simple = [];
var sCnt = 0;

inds.forEach(function(ind) {
    if (ind) {  // skip null entries
        var sInd = {
            id: ind.id,
            spouses: [],
            children: []
        };
        ind.infos.forEach(function(inf){
            if (inf.tag === 'NAME') {
                sInd.name = inf.desc;
            }
        });
        ind.infos.forEach(function(inf){
            if (inf.tag === 'SEX') {
                sInd.sex = inf.desc;
            }
        });
        ind.infos.forEach(function(inf){
            if (inf.tag === 'BIRT') {
                sInd.birth = inf.date;
            }
        });
        ind.infos.forEach(function(inf){
            if (inf.tag === 'DEAT') {
                sInd.death = inf.date;
            }
        });
        var role;
        ind.links.forEach(function(iLink) { // add spouses and natural children
           if (iLink.type === 'FAMS') {
               var spouseFam = fams[iLink.target];
               if (spouseFam.husband) {
                   if (spouseFam.husband === sInd.id) { // self link
                       role = 'HUSB'
                   } else {
                       sInd.spouses.push(spouseFam.husband)
                   }
               }
               if (spouseFam.wife) {
                   if (spouseFam.wife === sInd.id) { // self link
                       role = 'WIFE'
                   } else {
                       sInd.spouses.push(spouseFam.wife)
                   }
               }
               spouseFam.children.forEach(function(child) {
                   if ((role==='HUSB' && child.fatherRelation==='Natural') ||
                       (role==='WIFE' && child.motherRelation==='Natural')) {
                       sInd.children.push(child.target)
                   }
               })
           }
        });
        if (sInd.spouses.length || sInd.children.length) {  // spouse unknown and no children - not interesting
            simple[sInd.id] = sInd;
            sCnt++;
        }
    }
});

// now we traverse the tree: For each individual with more than one child, we follow each child descendants
// separately, and see if we arrive at the same individual

var loopCnt = 0;
fams.forEach(function(couple) {
    if (couple) {
        cc = 0;
        couple.children.forEach(function (c) {
            if (simple[c.target]) {    // child exists in tree, meaning he has spouse or children
                cc++;
            }
        });
        if (cc > 1) {     // common ancestor must have at least 2 children
            var commonAncestor = couple.husband ? simple[couple.husband] : simple[couple.wife];  // choose representative of couple
            if (commonAncestor) {        // to avoid cases of no parents at all
                simple.forEach(function (s) {  // clear all ancestor marks in tree
                    s.ancestor = undefined;
                });
                commonAncestor.children.forEach(function (pathHead) {
                    if (simple[pathHead]) {
                        traverse(simple[pathHead], couple, simple[pathHead], simple, []);
                    }
                })
            }
        }
    }
});
/*
simple.forEach(function(commonAncestor) {
        var cc = 0;
        commonAncestor.children.forEach(function (c) {   // count only existing children
            if (simple[c]) {    // child exists in tree, meaning he has spouse or children
                cc++;
            }
        });
        if (cc > 1) {   // common ancestor must have at least 2 children
            simple.forEach(function (s) {  // clear all ancestor marks in tree
                s.ancestor = undefined;
            });
            commonAncestor.children.forEach(function (pathHead) {
                if (simple[pathHead]) {
                     traverse(simple[pathHead], commonAncestor, simple[pathHead], simple, []);
                }
            })
        }
});
*/
console.log(loopCnt+' loops found');

