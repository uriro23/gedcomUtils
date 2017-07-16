// list all individuals not connected to home person

mInd = require('./tree/individuals.js');
mFam = require('./tree/families.js');

var inds = mInd.individuals;
var fams = mFam.families;

var children, husband, wife, parent;

inds.forEach(function(ind) {  // initialize simplified graph
    if (ind) {
        ind.edges = [];
        ind.isConnected = false;
    }
});

// populate simplified graph
fams.forEach(function(fam) {
    if(fam) {
        children = [];
        husband = wife = parent = undefined;
        fam.links.forEach(function (lnk) {    // concentrate family links by type
            if (lnk.type === 'HUSB') {
                husband = lnk.target;
            } else if (lnk.type === 'WIFE') {
                wife = lnk.target;
            } else if (lnk.type === 'CHIL') {
                children.push(lnk.target);
            } else {
                console.log('unrecognized family relation ' + lnk.type)
            }
        });
        if (husband && wife) {   // if both exist, point husband to wife
            inds[husband].edges.push(wife);
            inds[wife].edges.push(husband);
            parent = wife;       // select representative parent to whom to link the children
        } else if (wife) {
            parent = wife;
        } else if (husband) {
            parent = husband;
        }
        if (parent) {
            children.forEach(function (child) {
                inds[parent].edges.push(child); // if any parent exists, point parent to children
                inds[child].edges.push(parent);
            });
        }
    }
});

// traverse graph starting from home person, marking all visited vertices
var stack = [];
var ii = 3089;
while (ii) {
    // console.log('visiting '+ii);
    inds[ii].isConnected = true;
    ii = inds[ii].edges.pop();
    if (!ii) {
      ii = stack.pop();
      // console.log('backtracking to '+ii);
    } else {
        stack.push(ii);
    }
}

// list names ofall unconnected persons
var name;
var connCnt = 0;
inds.forEach(function(ind) {
    if (ind) {
        if (!ind.isConnected) {
            ind.infos.forEach(function (inf) {
                if (inf.tag === 'NAME') {
                    name = inf.desc;
                }
            });
            connCnt++;
            console.log(name);
        }
    }
});
console.log(connCnt);

