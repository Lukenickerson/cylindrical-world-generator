
//====================================================== TERRAIN

// cwg = cywog = cylindrical world generator
function TerrainClass(x,y,h){
    this.height = h;
    //this.previousHeight = 0;
    this.plateIndex = null;
    this.pos = new Coords(x,y);
    this.temp = 0;
    this.isLand = true;
    this.isUnderwater = false;
    this.isDrop = false;
    // Organisms
    this.microOrgs = 0;
    this.insects = 0;
    this.grass = 0;
    // Minerals
    this.snow = 0;
    this.soil = 0;
    this.sand = 0;
    this.clay = 0;
    this.stone = this.height;
}
TerrainClass.prototype.set = function(ter){
    
    this.insects   = ter.insects;
    this.grass     = ter.grass;
    
    this.snow = ter.snow;
    this.soil = ter.soil;
    this.sand = ter.sand;
    this.clay = ter.clay;
    this.stone = ter.stone;

    this.setHeight();
}
TerrainClass.prototype.getHeight = function(){
    return Math.max(this.snow + this.soil + this.sand + this.clay + this.stone, 0);
}
TerrainClass.prototype.setHeight = function(){
    this.height = this.getHeight();
    if (this.height > 200) {
        this.stone += (200 - this.height);
        this.height = this.getHeight();
    }
    return this;
}
TerrainClass.prototype.setHeightTo = function(h){
    var diff = h - this.height;
    this.stone += diff;
    this.setHeight();
    return this;
}
TerrainClass.prototype.addStone = function(h){
    this.stone += h;
    this.setHeight();
    return this;
}
TerrainClass.prototype.addSoil = function(h){
    this.soil += h;    
    this.setHeight();
    return this;
}
TerrainClass.prototype.removeHeight = function(h){
    var layerAmount = Math.min(h, this.soil);
    this.soil -= layerAmount;
    h -= layerAmount;
    this.stone -= h;
    this.setHeight();
    return this;
}

//====================================================== WORLD
function WorldClass(seed,x,y){
    this.seed = seed;
    this.age = 0;
    this.eon = 0;
    this.size = new Coords(x,y);
    this.area = (x * y);
    this.waterVolume = (x * y) * 12;
    this.equator = (y / 2);
    this.baseTemp = 50;
    this.randSeed = 1;
    this.terrain = [];
    this.plates = [];
    this.plateCount = 20;
    this.maxHeight = 200;
    this.minHeight = 0;
    this.hasLife = false;
    this.heightRange = this.maxHeight - this.minHeight;
    this.waterHeight =  this.heightRange / 2;
    this.init();
}
WorldClass.prototype.random = function(){
    // http://stackoverflow.com/a/19303725/1766230
    var x = Math.sin(this.randSeed++) * 10000;
    return x - Math.floor(x);
}
WorldClass.prototype.getRandomPosition = function(){
    var x = parseInt(this.random() * this.size.x);
    var y = parseInt(this.random() * this.size.y);
    return new Coords(x,y);
}
WorldClass.prototype.getRandomPlusMinus = function(n){
    var m = (this.random() > 0.5) ? 1 : -1;
    return (m * this.random() * n);
}
WorldClass.prototype.loopOverTerrain = function(cb){
    var x, y;
    for(y = 0; y < this.size.y; y++) {
        for(x = 0; x < this.size.x; x++) {
            cb(this.terrain[y][x], x, y);
        }
    }
}
WorldClass.prototype.fixBoundedX = function(x){
    if (x < 0) {
        return (this.size.x + x);
    } else if (x >= this.size.x) {
        return (x % (this.size.x - 1));
    } else {
        return x;
    }
}
WorldClass.prototype.fixBoundedY = function(y){
    if (y < 0) {
        return 0;
    } else if (y >= this.size.y) {
        return (this.size.y - 1);
    } else {
        return y;
    }
}
WorldClass.prototype.getAnyTerrain = function(terrain, x, y){
    x = this.fixBoundedX(x);
    y = this.fixBoundedY(y);
    try {
        var ter = terrain[y][x];
    } catch (e) {
        console.error(e);
        console.log(x, y);
        console.log(terrain);
    }
    var ter = terrain[y][x];
    return ter;
}
WorldClass.prototype.getTerrain = function(x, y){
    return this.getAnyTerrain(this.terrain, x, y);
}
WorldClass.prototype.getAnyTerrainByPos = function(terrain, pos){
    return this.getAnyTerrain(terrain, pos.x, pos.y);
}
WorldClass.prototype.getTerrainByPos = function(pos){
    return this.getTerrain(pos.x, pos.y);
}


WorldClass.prototype.getRandomPlateVel = function(){
    return new Coords(this.getRandomPlusMinus(1), this.getRandomPlusMinus(1));
}
WorldClass.prototype.getAnyTerrainNeighbors = function(terrain, pos, d){
    var w = this;
    var n = [];
    for (var x = -1 * d; x <= d; x++) {
        for (var y = -1 * d; y <= d; y++){
            n.push(
                w.getAnyTerrain(terrain, pos.x + x, pos.y + y)
            );
        }
    }
    return n;
}
WorldClass.prototype.getTerrainNeighbors = function(pos, d){
    return this.getAnyTerrainNeighbors(this.terrain, pos, d);
}
WorldClass.prototype.loopOverTerrainNeighbors = function(pos, d, callback){
    var neighbors = this.getTerrainNeighbors(pos, d);  
    var nl = neighbors.length;
    for (var n = 0; n < nl; n++){
        callback(n, neighbors[n]);
    }
}


WorldClass.prototype.getTerrainCopy = function(){
    var oldTerrain = this.getBlankTerrainArray();
    this.loopOverTerrain(function(ter, x, y){
        oldTerrain[y][x].set( ter );
    });
    return oldTerrain;
}

WorldClass.prototype.getWaterVolumeAtHeight = function(h){
    var volume = 0;
    this.loopOverTerrain(function(ter, x, y){
        if (ter.height < h) {
            volume += (h - ter.height);
        }
    });
    return volume;
}


WorldClass.prototype.getBlankTerrainArray = function(){
    var terrain = [];
    var h = (this.maxHeight + this.minHeight) / 2;
    for(y = 0; y < this.size.y; y++) {
        terrain[y] = [];
        for(x = 0; x < this.size.x; x++) {
            terrain[y][x] = new TerrainClass(x,y,h);
        }
    }
    return terrain;
}

WorldClass.prototype.createPlateCells = function(){
    var w = this;
    var plateCount = w.plateCount;
    var plateColors = ["#0f0", "#00f", "#ff0", "#0ff", "#f0f", 
                       "#090", "#009", "#990", "#099", "#909",
                       "#060", "#006", "#660", "#066", "#606",
                       "#6c6", "#66c", "#cc6", "#6cc", "#c6c",
                       "#3f3", "#33f", "#ff3", "#3ff", "#f3f"
                      ];
    var pos, vel, isContinental;
    // Create plates
    while (plateCount > 0) {
        plateCount--;
        pos = w.getRandomPosition();
        vel = w.getRandomPlateVel();
        var fff = w.random();
        //console.log(fff);
        isContinental = Math.round(fff); // 0 or 1
        w.plates.push({
            pos: pos,
            isContinental: ((isContinental) ? true : false),
            isOceanic: ((isContinental) ? false : true),
            colorString: plateColors[plateCount],
            vel: vel
        });
    }

    this.setPlateCells();
    
    this.loopOverTerrain(function(ter, x, y){       
        // Adjust heights a little for continental vs. oceanic        
        if (w.plates[ter.plateIndex].isContinental) {
            ter.height += 1;  
        } else {
            ter.height -= 1;
        }
    });
}

WorldClass.prototype.setPlateCells = function(callback){
    var w = this;
    var pcl = w.plates.length;
    
    this.loopOverTerrain(function(ter, x, y){
        var terrainPos = new Coords(x,y);
        var bestDistance = Infinity;
        var bestPlateIndex = -1;
        
        // Loop over plates and find the nearest plate
        var setPlateIndex = function(offsetX){
            var d, i, plateCoords;
            for(i = 0; i < pcl; i++){
                plateCoords = new Coords((w.plates[i].pos.x + offsetX), w.plates[i].pos.y);
                d = plateCoords.getDistance(terrainPos);
                if (d < bestDistance) {
                    bestPlateIndex = i;
                    bestDistance = d;
                }
            }           
        }
        // Need to account for cyclindrical shape of world by looking left and right
        setPlateIndex(0);
        setPlateIndex(w.size.x * -1);
        setPlateIndex(w.size.x);
        
        if (typeof callback == "function") {
            callback(ter, bestPlateIndex, bestDistance);
        } else {
            ter.plateIndex = bestPlateIndex;
        }
        
    });    
}

WorldClass.prototype.setTerrainVars = function(){
    var w = this;
    w.loopOverTerrain(function(ter, x, y){
        ter.isDrop = false;
        ter.isLand = (ter.height > w.waterHeight);
        ter.isUnderwater = !(ter.isLand);
    });
}

WorldClass.prototype.movePlates = function(){
    var w = this;
    
    var oldTerrain = w.getTerrainCopy();
    var pcl = w.plates.length;
    var plate, plateIntegerPosDiff, didPlateMove;
    var plateHitHeight = w.heightRange / 3;
    var sinkHeight = w.heightRange / 200;
    
    // Loop over plates
    for(i = 0; i < pcl; i++){
        plate = w.plates[i];
        
        if (w.random() < 0.1) {
            plate.vel = w.getRandomPlateVel();
        }
        
        plateIntegerPosDiff = new Coords(
            Math.round(plate.pos.x + plate.vel.x) - Math.round(plate.pos.x)
            ,Math.round(plate.pos.y + plate.vel.y) - Math.round(plate.pos.y)
        );
        didPlateMove = (plateIntegerPosDiff.x != 0 || plateIntegerPosDiff.y != 0);
        // Actually move the plate point
        plate.pos.add(plate.vel);
        
        // Move to other side of the world
        plate.pos.x = w.fixBoundedX(plate.pos.x);
        // If moving up/down off planet...
        if (plate.pos.y < 0) {
            plate.pos.y = 0;
            plate.vel.y = plate.vel.y * -1;
        } else if (plate.pos.y > w.size.y) {
            plate.pos.y = w.size.y;
            plate.vel.y = plate.vel.y * -1;
        }
        
        // Look at terrain in this plate, if plate moved
        if (didPlateMove) {
            w.loopOverTerrain(function(ter, x, y){
                if (ter.plateIndex == i) {
                    // Move terrain to new position
                    var newPos = new Coords(
                        x + plateIntegerPosDiff.x
                        ,y + plateIntegerPosDiff.y
                    );
                    var oldTer = oldTerrain[y][x];
                    var newTer = w.getTerrainByPos(newPos);
                    newTer.set( oldTer );
                    ter.removeHeight( sinkHeight );
                }
            });
        }
        
    }       
    
    w.setPlateCells(function(ter, bestPlateIndex, bestDistance){
        if (ter.plateIndex != bestPlateIndex) {
            var originalPlate = w.plates[ter.plateIndex];
            var newPlate = w.plates[bestPlateIndex];
            
            if (newPlate.isContinental) {
                if (w.random() > 0.7) {
                    var h = (w.random() * plateHitHeight);
                    ter.addStone(h);
                    w.getTerrain(ter.pos.x, ter.pos.y+1).addStone(h/2);
                    w.getTerrain(ter.pos.x, ter.pos.y-1).addStone(h/2);
                    w.getTerrain(ter.pos.x+1, ter.pos.y).addStone(h/2);
                    w.getTerrain(ter.pos.x-1, ter.pos.y).addStone(h/2);
                    ter.grass = 0;
                }
            } else {
                ter.removeHeight(sinkHeight);
            }
        }
    });
    
    w.setPlateCells();
}
WorldClass.prototype.addHeightNoise = function(n){
    var x, y, r, w = this;
    this.loopOverTerrain(function(ter){
        r = w.random();
        if (r > 0.6) { ter.addStone(n); }
        else if (r < 0.4) { ter.removeHeight(n); }
        else {    }
    });
}
/*
WorldClass.prototype.addHeightNoiseToEdges = function(){
    var bottomYIndex = this.size.y - 1;
    for (var x = 0, xl = this.size.x; x < xl; x++){
        this.terrain[0][x].addStone( this.getRandomPlusMinus(1) );
        this.terrain[bottomYIndex][x].addHeight( this.getRandomPlusMinus(1) );
    }
}
*/
WorldClass.prototype.erode = function(sourceTer, destTer, amount){
    var heightDiff = Math.abs(sourceTer.height - destTer.height);
    //var underAmount = w.waterHeight - destTer.height;
    amount = Math.min(heightDiff, amount);
    amount = Math.max(amount, 0);
    sourceTer.removeHeight(amount);
    destTer.addSoil(0.9 * amount);
}
WorldClass.prototype.meteors = function(){
    var w = this;
    //this.addHeightNoise(1);
    this.loopOverTerrain(function(ter, x, y){
        if (ter.isLand) {
            r = w.random();
            if (r > 0.5) {
                //ter.addHeight(w.getRandomPlusMinus(4));
            } else if (!w.hasLife && r < 0.00001) {
                ter.microOrgs = 1;
            }
        }
    });
}
WorldClass.prototype.coastalErosion = function(){
    var w = this;
    var oldTerrain = w.getTerrainCopy(); 
    var coastCount = 0;
    w.loopOverTerrain(function(ter, x, y){
        // Look only at land...
        if (ter.height > w.waterHeight) {
            var neighbors = []; // neighbor array
            // Get neighbors and see if they are underwater
            neighbors = w.getAnyTerrainNeighbors(oldTerrain, ter.pos, 1);
            var nl = neighbors.length;
            var npos, newNeighborTerr, underAmount;
            for (var n = 0; n < nl; n++){
                underAmount = w.waterHeight - neighbors[n].height;
                if (underAmount > 0.3) {
                    npos = neighbors[n].pos;
                    newNeighborTerr = w.getTerrainByPos(npos);
                    w.erode(ter, newNeighborTerr, 0.5);
                    ter.grass = 0;
                    //ter.height = (ter.height + w.waterHeight) / 2;
                    coastCount++;
                }
            }
        }
    });
    //console.log("Eroded ", coastCount);
}

// Partially based on ideas from http://ranmantaru.com/blog/2011/10/08/water-erosion-on-heightmap-terrain/
WorldClass.prototype.rainDropErosion = function(){
    var w = this;
    var nDrops = w.area / 5;
    var dropMovesLeft;
    
    var DropClass = function(){
        this.pos = new Coords(0,0);
        this.ter;
        this.sediment = 0;
        this.capacity = 10;
        this.speed = 0.5;
        this.movesLeft = 50;
        this.lowestNeighbor;
        this.init();
    }
    DropClass.prototype.init = function(){
        var randomPos = w.getRandomPosition();
        this.setLocation(randomPos);   
    }
    DropClass.prototype.setLocation = function(p){
        this.pos.set(p);
        this.ter = w.getTerrainByPos(this.pos);
        this.ter.isDrop = true;
    }
    DropClass.prototype.setLowestNeighbor = function(){
        var drop = this;
        var lowestHeight = 1000000;
        w.loopOverTerrainNeighbors(this.pos, 1, function(n, neighbor){
            if (neighbor.height < lowestHeight) {
                drop.lowestNeighbor = neighbor;
                lowestHeight = drop.lowestNeighbor.height;
            }
        });      
    }
    DropClass.prototype.move = function(){
        if (this.sediment > this.capacity) {
            this.deposit(0.2);
        } else {
            this.erode();
        }
        var hDiff = (this.ter.height - this.lowestNeighbor.height);
        this.speed = (this.speed + hDiff) / 2;
        this.capacity = 10 + this.speed * 20;
        this.setLocation(this.lowestNeighbor.pos);
    }
    DropClass.prototype.erode = function(){
        var erodeAmount = this.speed;
        var hDiff = (this.ter.height - this.lowestNeighbor.height);
        erodeAmount = Math.min(erodeAmount, hDiff);
        this.sediment += erodeAmount;
        this.ter.removeHeight(erodeAmount);
    }
    DropClass.prototype.deposit = function(depositAmount){
        depositAmount = Math.min(this.sediment, depositAmount);
        this.sediment -= depositAmount;
        depositAmount = depositAmount * 0.1;
        // Add 1/10th to location
        this.ter.addSoil(depositAmount);
        // Add 1/10th to 9 neighbors (including self)
        w.loopOverTerrainNeighbors(this.pos, 1, function(n, neighbor){
            neighbor.addSoil(depositAmount);
        });
    }
    
    var hitWater = 0;
    var endWater = 0;
    var noWhereToGo = 0;
    for (var i = 0; i < nDrops; i++){
        var drop = new DropClass();
        if (drop.ter.height > w.waterHeight){
            while (drop.movesLeft > 0) {
                drop.movesLeft--;
                drop.setLowestNeighbor();
                // Nowhere for drop to move? or hit water?
                if (drop.pos.isEqual(drop.lowestNeighbor.pos)) {
                    drop.movesLeft = 0;
                    noWhereToGo++;
                } else if (drop.ter.height < w.waterHeight) {
                    drop.movesLeft = 0;
                    endWater++;
                } else { // Pick up and go
                    drop.move();
                }
                //console.log(i, drop.pos.x, drop.pos.y, drop.sediment);
            }
            // Deposition - Drop all drop contents
            drop.deposit(drop.sediment);
        } else {
            //console.log("drop hits water!");
            hitWater++;
        }
    }
    //console.log("hitWater = ", hitWater, "noWhereToGo =", noWhereToGo, "endWater =", endWater);
}

WorldClass.prototype.smooth = function(){
    var w = this;
    var s = 10; // make lower for more smoothing
    var d = s + 2;
    var xOffset1 = Math.floor(w.random() * 3) - 1;
    var yOffset1 = Math.floor(w.random() * 3) - 1;
    var xOffset2 = Math.floor(w.random() * 3) - 1;
    var yOffset2 = Math.floor(w.random() * 3) - 1;
    w.loopOverTerrain(function(ter, x, y){
        var h1 = w.getTerrain( x + xOffset1, y + yOffset1).height;
        var h2 = w.getTerrain( x + xOffset2, y + yOffset2).height;
        var avgHeight = ((ter.height * s) + h1 + h2) / d;
        ter.setHeightTo( avgHeight );
    });
}

WorldClass.prototype.adjustWater = function(){
    var w = this;   
    var volume = 0;
    var volume = w.getWaterVolumeAtHeight(w.waterHeight);
    var volDiff = volume - w.waterVolume;
    w.waterHeight -= (volDiff / w.area) * 2;
    w.waterHeight = Math.min(Math.max(w.minHeight, w.waterHeight), w.maxHeight);
    //console.log("Volume", volume, "Expected Volume", w.waterVolume, "volDiff", volDiff, "waterHeight -=", (volDiff / w.area), " = ",  w.waterHeight);
}

WorldClass.prototype.spreadLife = function(){
    var w = this;
    w.hasLife = false;
    w.loopOverTerrain(function(ter, x, y){
        if (ter.microOrgs > 0) {
            w.hasLife = true;
            var range = (ter.isLand) ? 1 : 3;
            var x = Math.round(w.getRandomPlusMinus(range));
            var y = Math.round(w.getRandomPlusMinus(range));
            var newTer = w.getTerrain(ter.pos.x + x, ter.pos.y + y);
            newTer.microOrgs += 1;
            if (newTer.microOrgs > 2) newTer.microOrgs = 0;
            if (ter.isLand && ter.grass == 0) {
                var evolution = Math.round(w.random() * 4000);
                if (evolution == 1) {
                    ter.grass = 1;
                }
            }
        }
        if (ter.grass > 0) {
            w.hasLife = true;
            if (ter.isLand) {
                // *** kill grass with temp
                if (ter.height > (w.maxHeight * 0.9)) {
                    ter.grass = 0;
                } else {
                    //if (ter.soil < 1) { ter.convertToSoil }
                    var x = Math.round(w.getRandomPlusMinus(1));
                    var y = Math.round(w.getRandomPlusMinus(1));
                    var newTer = w.getTerrain(ter.pos.x + x, ter.pos.y + y);
                    if (Math.abs(newTer.height - ter.height) < 40 
                        && newTer.soil >= 0.5) 
                    {
                        newTer.grass += 1;
                        if (newTer.grass > 10) newTer.grass = -1;
                    }
                    
                }
            } else { // not land, kill grass
                ter.grass = 0;
            }
            
        }
    });
}

WorldClass.prototype.ageEon = function(ageIterations){
    var w = this;
    for (var ageI = 0; ageI < ageIterations; ageI++){
        w.eon++;
        w.setTerrainVars();
        w.movePlates();
        w.meteors();
        w.rainDropErosion();
        w.coastalErosion();
        w.smooth();
        w.adjustWater();
        w.spreadLife();
    }
    //console.log("Age = ", w.eon, " eons");
}

WorldClass.prototype.init = function(){
    var w = this;
    w.randSeed += (w.seed * 1000);
    w.terrain = w.getBlankTerrainArray();
    w.addHeightNoise(50);
    w.smooth();
    w.adjustWater();
    w.createPlateCells();
}


//================================ G R I D 

function GridClass(cwg){
    this.parent = cwg;
    this.world = null;
    this.ctx = null;
    this.dimensions = null;
    this.offset = new Coords(0,0);
    this.blockSize = 5;
    this.isGridOn = false;
    this.viewType = "BASIC";
    this.showDrops = false;
    this.showGrass = true;
    this.showMicroOrgs = false;
    this.$ageEon = $('.ageEon');
    this.ageTimerId = 0;
    
    this.moveByCoords = function(c){
        //console.log("move ", c);
        this.offset.add(c);
        this.drawWorld();
    }
    this.moveLeft = function(u){
         this.moveByCoords( new Coords((u * this.blockSize),0) );
    };
    this.moveRight = function(u){
        this.moveByCoords( new Coords(u * -1 * this.blockSize,0) );
    };
    this.moveUp = function(u){
        this.moveByCoords( new Coords(0,(u * -1 * this.blockSize)) );
    };
    this.moveDown = function(u){
        this.moveByCoords( new Coords(0,u * this.blockSize) );
    };

    this.getHeightColor = function(ter){
        var w = this.world;
        var r = 100, g = 100, b = 100;
        

            
        if (ter.isUnderwater) {        // WATER
            //var depthPercent = (w.waterHeight - ter.height) / w.heightRange;
            var waterRange = w.heightRange/2;
            var shallowPercent = (waterRange - (w.waterHeight - ter.height)) / waterRange;
            b = (shallowPercent * 50) + 205; // 205 - 255
            r = 50; //(shallowPercent * 50) + 30; // 30 - 80
            g = (shallowPercent * 70) + 20; // 20 - 120
        
        } else {                     // LAND
            var heightPercent = (ter.height - w.minHeight) / w.heightRange;
            r = (heightPercent * 160) + 50; // 50 - 210
            g = r;
            b = r;            
            
            if (ter.snow >= 1) {
                r += 100;
                g += 100;
                b += 100;
            } else if (ter.soil >= 1) {
                if (heightPercent > 0.95) { // White mountains
                    // stay gray
                } else if (heightPercent > 0.9) { // White/Yellowish mountain
                    b += 10;
                } else if (heightPercent > 0.8) { // Yellowish mountain
                    r += 25;
                    g += 25;
                } else if (heightPercent > 0.7) { // Yellowish
                    r += 25;
                    g += 15;
                    b -= 25;            
                } else if (heightPercent > 0.6) { // Browish/Yellowish
                    r += 25;
                    g += 10;
                    b -= 25;
                } else if (heightPercent > 0.5) { // Brown
                    r += 30;            
                    b -= 30;            
                } else if (heightPercent > 0.3) { // Dark Brown
                    r += 20;
                    b -= 20;
                } else if (heightPercent > 0.2) { // Dark Brown / Gray
                    r += 10;
                    b -= 10;
                } else if (heightPercent > 0.1) { // Dark Brown / Gray
                    r += 5;
                    b -= 5;            
                }
            }
            
            if (this.showGrass && ter.grass > 0) {
                g += 50;
                b -= 25;
                r -= 25;
            }

            if (this.showDrops && ter.isDrop) r = 255;
        }
        
        if (this.showMicroOrgs && ter.microOrgs > 0) {
            g += 100;
            b += 100;
        }
        
        r = Math.max(Math.min(Math.floor(r), 255), 0);
        g = Math.max(Math.min(Math.floor(g), 255), 0);
        b = Math.max(Math.min(Math.floor(b), 255), 0);
        
        return "rgb(" + r + "," + g + "," + b + ")";
    }
    
    this.getPlateColor = function(ter, world){
        for(i = 0; i < world.plates.length; i++){
            if (world.plates[i].pos.isEqualInteger(ter.pos)) {
                if (world.plates[i].isContinental) return '#fff';
                else return '#000';
            }
        }        
        return world.plates[ter.plateIndex].colorString;
    }
    
    this.clear = function(){
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.dimensions.x, this.dimensions.y);
    }

    this.toggleEonTime = function(){
        if (this.ageTimerId == 0) {
            this.ageWorldByEons(100);
        } else {
            this.stopEonTime();
        }
    }
    
    this.stopEonTime = function(){
        window.clearTimeout(this.ageTimerId);
        this.ageTimerId = 0;
    }
    
    this.ageWorldByEons = function(ageIterations){
        var grid = this;
        grid.showDrops = false;
        this.world.ageEon(1);
        grid.drawWorld();
        
        if (ageIterations > 1) {
            ageIterations--;
            grid.ageTimerId = window.setTimeout(function(){
                grid.ageWorldByEons(ageIterations);
            }, 10);
        } else {
            grid.stopEonTime();
        }
    }
    
    this.toggleViewType = function(){
        if (this.viewType == "BASIC") {
            this.viewType = "PLATES";
        } else {
            this.viewType = "BASIC";
        }
        this.drawWorld();
    }
    
    this.zoom = function(zoomAmount){
        this.blockSize += zoomAmount;
        this.blockSize = Math.max(1, this.blockSize);
        this.drawWorld();
    }
    
    this.drawWorld = function(){
        var grid = this, 
            ctx = this.ctx;
        grid.clear();
        ctx.fillStyle = '#ddd';
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        grid.world.loopOverTerrain(function(ter, x, y){
            var pos = new Coords(x,y);
            pos.multiply(grid.blockSize).add(grid.offset);
            if (pos.x > grid.dimensions.x || pos.y > grid.dimensions.y) {
                // don't draw, it's "off camera"
            } else {
                if (grid.viewType == "BASIC") {
                    ctx.fillStyle = grid.getHeightColor(ter);
                } else {
                    ctx.fillStyle = grid.getPlateColor(ter, grid.world);
                }
                //console.log(o.getHeightColor(ter));
                ctx.fillRect(pos.x, pos.y, grid.blockSize, grid.blockSize);
                if (grid.isGridOn) {
                    ctx.strokeRect(pos.x, pos.y, grid.blockSize, grid.blockSize);
                }
            }
        });
        this.$ageEon.text(grid.world.eon);
    }
    this.initCanvas = function(canvasId){
        var cnvs = document.getElementById(canvasId);
		console.log(cnvs, canvasId);
        this.ctx = cnvs.getContext("2d");
        this.dimensions = new Coords(cnvs.width, cnvs.height);
    }
};

var cwg = {};

cwg.buildWorld = function(){
    var seed = $('#seed').val();
	//this.world = new WorldClass(seed,200,100); // 200 x 100
    this.world = new WorldClass(seed,150,75); 
    this.grid.blockSize += 2;
    this.grid.world = this.world;
    this.grid.drawWorld();
}


cwg.initKeyboard = function(){
    var o = this;
    document.addEventListener("keydown", function(e){
        switch(e.keyCode){
            case 37: // left
            case 65: // a
                o.grid.moveLeft(1);
                e.preventDefault();
                break;
            case 38: // up
            case 87: // w
                o.grid.moveUp(1);
                e.preventDefault();
                break;
            case 39: // right
            case 68: // d
                o.grid.moveRight(1);
                e.preventDefault();
                break;
            case 40: // down
            case 83: // s
                o.grid.moveDown(1);
                e.preventDefault();
                break;
            case 187: // +
                o.grid.zoom(1);
                break;
            case 189: // -
                o.grid.zoom(-1);
                break;
            case 221: // ]
                o.world.waterHeight += 2;
                console.log("waterHeight", o.world.waterHeight);
                o.world.setTerrainVars();
                o.grid.drawWorld();
                break;
            case 219: // [
                o.world.waterHeight -= 2;
                console.log("waterHeight", o.world.waterHeight);
                o.world.setTerrainVars();
                o.grid.drawWorld();
                break;
            case 82: // r
                o.grid.showDrops = true;
                o.world.rainDropErosion();
                o.grid.drawWorld();
                break;
            case 88: // x
                o.grid.isGridOn = !(o.grid.isGridOn);
                o.grid.drawWorld();
                break;
            case 90: // z
                o.world.smooth();
                o.grid.drawWorld();
                break;
            case 67: // c
                console.log("coastal erosion");
                o.world.coastalErosion();
                o.grid.drawWorld();
                break;
            case 86: // v
                o.world.adjustWater();
                console.log("waterHeight", o.world.waterHeight);
                o.world.setTerrainVars();
                o.grid.drawWorld();
                break;
            case 76: // l
                o.world.spreadLife();
                o.grid.drawWorld();
                break;
            case 77: // m
                o.grid.showMicroOrgs = !(o.grid.showMicroOrgs);
                o.grid.drawWorld();
                break;
            case 71: // g
                o.grid.showGrass = !(o.grid.showGrass);
                o.grid.drawWorld();
                break;
            case 80: // p
                o.world.movePlates();
                o.grid.drawWorld();
                break;
            case 13: // enter
                o.grid.toggleEonTime();
                //o.grid.ageWorldByEons(5);
                e.preventDefault();
                break;
            case 32: // space
                o.world.setTerrainVars();
                o.grid.toggleViewType();
                e.preventDefault();
                break;
            default:
                console.log(e.keyCode);
        }
        
    }, false);
}

cwg.init = function(){
    var o = this;
    o.grid = new GridClass(cwg);
    o.grid.initCanvas("cnvs");
    $('#restart').click(function(e){
        o.buildWorld();
    });
	$('button.enter').click(function(e){
		o.grid.toggleEonTime();
	});
    cwg.initKeyboard();
}

$(document).ready(function(){
	cwg.init();
	cwg.buildWorld();
	console.log(cwg.world);
	cwg.grid.ageWorldByEons(2);
});


// GRID TEST
/*
var cnvs = document.getElementById("cnvs");
var ctx = cnvs.getContext("2d");
var baseCubeSize = 24;
var width = cnvs.width;
var height = cnvs.height;
var gridSizeX = 13;
var gridSizeY = 17;
//ctx.setTransform(0.5, 0.5, 0, 1, 0, 0);
//ctx.rotate(Math.PI/9);
var y, x, xPos = 0, yPos = 50, sizeX, sizeY;
for(y = 0; y < gridSizeY; y++) {
    sizeY = (baseCubeSize/4) + ((3/4) * baseCubeSize) * (y/gridSizeY);
    xPos = 0;
    for(x = 0; x < gridSizeX; x++) {
        sizeX = baseCubeSize;
        ctx.fillStyle = '#ddd';
        ctx.strokeStyle = '#aaa';
        ctx.fillRect(xPos, yPos, sizeX, sizeY);
        ctx.strokeRect(xPos, yPos, sizeX, sizeY);
        xPos += sizeX;
    }
    yPos += sizeY;
}
*/