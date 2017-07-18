fs = require('fs');
pg = require('parse-gedcom');

function extId(str) {
    return Number(str.slice(2,str.length-1));
}

function getInfo(inf,hostId,hostType,places) {
    let info = {
        tag: inf.tag
    };
    if (inf.data) {
        info.desc = inf.data;
    }
    inf.tree.forEach(attr => {
        if (attr.tag === 'CONC') {
            info.desc += attr.data;
        } else if (attr.tag === 'DATE') {
            info.date = attr.data;
        } else if (attr.tag === 'TYPE') {
            info.tag = attr.data;
        } else if (attr.tag === 'PLAC') {
            info.place = {
                address: attr.data
            };
            attr.tree.forEach(subAttr => {
                if (subAttr.tab === 'CONC') {
                    info.place.address += subAttr.data;
                } else if (subAttr.tag === 'MAP') {
                    subAttr.tree.forEach(mapAttr => {
                        if (mapAttr.tag === 'LATI') {
                            info.place.latitude = mapAttr.data;
                        } else if (mapAttr.tag === 'LONG') {
                            info.place.longitude = mapAttr.data;
                        }
                    })
                }
            });
            info.place.id = getPlaceLink(info.place,hostId,hostType,places);
        }
    });
    return info;
}

function getPlaceLink(place,hostId,hostType,places) {
        let res;
        let tPlace = places.filter((plc,pli) => {
           if (place.address === plc.address) {
               res = pli;
               return true;
           } else {
               return false;
           }
       });
        if (!tPlace.length) {    // new place
            places.push(place);
            res = places.length-1;
            places[res].usage = [];
        }
        places[res].usage.push({
            type: hostType,
            link: hostId
        });
        return res;
}

fs.readFile('./tree/rosenan.ged','utf8',(err,data) => {
   if(err) {
       return console.log(err);
   }
   let tree = pg.parse(data);
   let indiCount = 0;
   let individuals = [];
   let famCount = 0;
   let families = [];
   let places = [];
    tree.forEach(item => {
       if (item.tag === 'INDI') {
           indiCount++;
           let indi = {
               id: extId(item.pointer),
               infos: [],
               links: []
           };
           item.tree.forEach(inf => {
               if (inf.tag === 'FAMS' || inf.tag === 'FAMC') {
                  let link = {
                      type: inf.tag,
                      target: extId(inf.data)
                  };
                  indi.links.push(link);
               } else {
                  indi.infos.push(getInfo(inf,indi.id,'INDI',places));
               }
           });
           individuals[indi.id] = indi;
       } else if (item.tag === 'FAM') {
           famCount++;
         let family = {
             id: extId(item.pointer),
             infos: [],
             children: []
         };
           item.tree.forEach(inf => {
               if (inf.tag === 'HUSB') {
                   family.husband = extId(inf.data);
               } else if (inf.tag === 'WIFE') {
                   family.wife = extId(inf.data);
               } else if (inf.tag === 'CHIL') {
                   let child = {
                       target: extId(inf.data)
               };
                   inf.tree.forEach(attr => {
                      if (attr.tag === '_FREL') {
                          child.fatherRelation = attr.data;
                      } else if (attr.tag === '_MREL') {
                          child.motherRelation = attr.data;
                      } else {
                          console.log('--- unrecognized family attribute ' + attr.tag);
                      }
                   });
                   family.children.push(child);
               } else {
                   family.infos.push(getInfo(inf,family.id,'FAM',places));
               }
           });
           families[family.id] = family;
       }
   });
    let str = 'exports.individuals = ' + JSON.stringify(individuals) + ';';
    fs.writeFile('./tree/individuals.js',str,'utf8',err => {
       if (err) {
           console.log(err);
       }
       str = 'exports.families = ' + JSON.stringify(families) + ';';
       fs.writeFile('./tree/families.js',str,'utf8',err => {
           if (err) {
               console.log(err);
           }
           str = 'exports.places = ' + JSON.stringify(places) + ';';
           fs.writeFile('./tree/places.js', str, 'utf8',err => {
               if (err) {
                   console.log(err);
               }
               str = JSON.stringify(tree);
               fs.writeFile('./tree/Rosenan.json',str,'utf8',err => {
                   if (err) {
                       console.log(err);
                   }
               })
           })
       });
    });
    console.log('total entries: '+tree.length);
    console.log('individuals: '+indiCount);
    console.log('families: '+famCount);
    console.log('places: '+places.length);
});