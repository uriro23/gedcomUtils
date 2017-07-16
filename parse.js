fs = require('fs');
pg = require('parse-gedcom');

function extId(str) {
    return Number(str.slice(2,str.length-1));
}

function getInfo(inf,hostId,hostType,places) {
    var info = {
        tag: inf.tag
    };
    if (inf.data) {
        info.desc = inf.data;
    }
    inf.tree.forEach(function (attr) {
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
            attr.tree.forEach(function (subAttr) {
                if (subAttr.tab === 'CONC') {
                    info.place.address += subAttr.data;
                } else if (subAttr.tag === 'MAP') {
                    subAttr.tree.forEach(function (mapAttr) {
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
        var res;
        var tPlace = places.filter(function(plc,pli) {
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

fs.readFile('./tree/rosenan.ged','utf8',function(err,data) {
   if(err) {
       return console.log(err);
   }
   var tree = pg.parse(data);
   var indiCount = 0;
   var individuals = [];
   var famCount = 0;
   var families = [];
   var places = [];
    tree.forEach(function(item) {
       if (item.tag === 'INDI') {
           indiCount++;
           var indi = {
               id: extId(item.pointer),
               infos: [],
               links: []
           };
           item.tree.forEach(function(inf) {
               if (inf.tag === 'FAMS' || inf.tag === 'FAMC') {
                  var link = {
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
         var family = {
             id: extId(item.pointer),
             infos: [],
             links: []
         };
           item.tree.forEach(function(inf) {
               if (inf.tag === 'HUSB' || inf.tag === 'WIFE' || inf.tag === 'CHIL') {
                   var link = {
                       type: inf.tag,
                       target: extId(inf.data)
               };
                   inf.tree.forEach(function(attr) {
                      if (attr.tag === '_FREL') {
                          link.fatherRelation = attr.data;
                      } else if (attr.tag === '_MREL') {
                          link.motherRelation = attr.data;
                      } else {
                          console.log('--- unrecognized family attribute ' + attr.tag);
                      }
                   });
                   family.links.push(link);
               } else {
                   family.infos.push(getInfo(inf,family.id,'FAM',places));
               }
           });
           families[family.id] = family;
       }
   });
    var str = 'exports.individuals = ' + JSON.stringify(individuals) + ';';
    fs.writeFile('./tree/individuals.js',str,'utf8',function(err) {
       if (err) {
           console.log(err);
       }
       str = 'exports.families = ' + JSON.stringify(families) + ';';
       fs.writeFile('./tree/families.js',str,'utf8',function(err) {
           if (err) {
               console.log(err);
           }
           str = 'exports.places = ' + JSON.stringify(places) + ';';
           fs.writeFile('./tree/places.js', str, 'utf8', function (err) {
               if (err) {
                   console.log(err);
               }
               str = JSON.stringify(tree);
               fs.writeFile('./tree/Rosenan.json',str,'utf8',function(err) {
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