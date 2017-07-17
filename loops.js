//  This module scans a parsed Gedcom tree and lists all individuals, having more than one child
// where a descendant of one child married a descendant of another.
// It lists the name of the common ancestor and the names of the marrying couple.
// This way we get only the youngest common ancestor of a related couple.
// We ignore parent/child relationships that are not natural

mInd = require('./tree/individuals.js');
mFam = require('./tree/families.js');

var inds = mInd.individuals;
var fams = mFam.families;

function times (no) {
    return no===1 ? 'once' : no===2 ? 'twice' : String(no)+' times';
}

function ordinal (no) {
    return String(no) + (no===1 ? 'st' : no===2 ? 'nd' : no===3 ? 'rd' : 'th');
}

function person (title,ind) {
    var str = title;
    if (ind.name) {
        str += ind.name.replace(' /','').replace('/','').replace('/',''); // remove slashes denoting last name part
    } else {
        str += '<no name>';
    }
    // str += (' ('+ind.id+')');
    if (ind.birth) {
        str += (', born '+ind.birth);
    }
    if (ind.death) {
        str += (', died '+ind.death);
    }
    return str;
}

function relation (first, second) {
    var l1 = first.pathLinks.length;
    var l2 = second.pathLinks.length;  // l1 <= l2
    var s2 = second.sex;
    var r;
    var str = first.sex==='M' ? 'his ' : 'her ';
    if (l1===0) {
        if (l2===0) {
            r = s2==='M' ? 'brother' : 'sister';
        } else if (l2===1) {
            r = s2==='M' ? 'nephew' : 'niece';
        } else if (l2===2) {
            r = s2==='M' ? 'great nephew' : 'great niece';
        } else {
            r = ordinal(l2-1)+ ' ' + (s2==='M' ? 'great nephew' : 'great niece');
        }
    } else if (l1===1) {
        if (l2===1) {
            r = 'cousin';
        } else {
            r = 'cousin ' + times(l2-1) + ' removed';
        }
    } else if (l1===l2) {
        r = ordinal(l1) + ' cousin';
    } else {
        r = ordinal(l1) + ' cousin ' + times(l2-l1) + ' removed';
    }
   return str+r+' ';
}

function displayLoop (graph,commonCouple,firstAncestor,secondAncestor,firstSpouse,secondSpouse) {
    if (firstSpouse.pathLinks.length > secondSpouse.pathLinks.length) { // always show "younger" spouse second
        displayLoop(graph,commonCouple,secondAncestor,firstAncestor,secondSpouse,firstSpouse);
        return;
    }
    console.log('');
    console.log('');
    console.log(person('',firstSpouse)+person(' married '+relation(firstSpouse,secondSpouse),secondSpouse));
    var isFirst = true;
    var fPath = [...firstSpouse.pathLinks];
    while (fPath.length) {
        var p = graph[fPath.pop()];
        var t = isFirst ? 'spouse' : p.sex==='M' ? 'father' : 'mother';
        isFirst = false;
        console.log(person(t+': ',p));
    }
    t = firstAncestor.sex==='M' ? 'father' : 'mother';
    console.log(person(t+': ',firstAncestor));
    t = secondAncestor.sex==='M' ? 'brother' : 'sister';
    console.log(person(t+': ',secondAncestor));
    var sPath = [...secondSpouse.pathLinks];
    while (sPath.length) {
        p = graph[sPath.shift()];
        t = p.sex==='M' ? 'son' : 'daughter';
        console.log(person(t+': ',p));
    }
    // console.log('');
    // if (commonCouple.husband) {
    //     console.log(person('Common father: ', simple[commonCouple.husband]));
    // }
    // if (commonCouple.wife) {
    //     console.log(person('Common mother: ', simple[commonCouple.wife]));
    // }
}

function traverse (current,common, head,graph,path) {
    // find out if current person and any of his/her spouses share the common ancestor
    current.pathLinks = path.map(function(p) {
        return p.id;
    });
    current.spouses.forEach(function(s) {
        if (graph[s]) {
            if (graph[s].ancestor &&  (graph[s].ancestor !== head.id)) {
                displayLoop(graph,common,head,graph[graph[s].ancestor],current,graph[s]);
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
            var cPath = [...path];
             cPath.push(graph[c]);
            traverse(graph[c],common, head,graph,cPath);
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

console.log('');
console.log(loopCnt+' loops found');

