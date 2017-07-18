// list all individuals not connected to home person

mInd = require('./tree/individuals.js');
mFam = require('./tree/families.js');

const inds = mInd.individuals;
const fams = mFam.families;

let children, husband, wife, parent;

inds.forEach(ind => {  // initialize simplified graph
    if (ind) {
        ind.edges = [];
        ind.isConnected = false;
    }
});

// populate simplified graph
fams.forEach(fam => {
    if(fam) {
        let parent = undefined;
        if (fam.husband && fam.wife) {   // if both exist, point husband to wife
            inds[fam.husband].edges.push(fam.wife);
            inds[fam.wife].edges.push(fam.husband);
            parent = fam.wife;       // select representative parent to whom to link the children
        } else if (fam.wife) {
            parent = fam.wife;
        } else if (fam.husband) {
            parent = fam.husband;
        }
        if (parent) {
            fam.children.forEach(child  => {
                inds[parent].edges.push(child.target); // if any parent exists, point parent to children
                inds[child.target].edges.push(parent);
            });
        }
    }
});

// traverse graph starting from home person, marking all visited vertices
let stack = [];
let ii = 3089;
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
let name;
let connCnt = 0;
inds.forEach(ind => {
    if (ind) {
        if (!ind.isConnected) {
            ind.infos.forEach(inf => {
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

