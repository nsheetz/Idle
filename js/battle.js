const Battle = ((window, document) => {
    "use strict";

    return class Battle extends EventEmitter {
        constructor(init, zone) {
            super();
    
            init = init || {};
    
            this.wave = init.wave || 1;
            this.subWave = init.subWave || 1;
            this.maxSubWave = init.maxSubWave || 20;
            this.highestWave = init.highestWave || 0;
            this.highestWaveSubWave = init.highestWaveSubWave || 0;
            this.maxSubWaveCurrentWave = init.maxSubWaveCurrentWave || 20;
            this.timestampTimeElapsedInRun = init.timestampTimeElapsedInRun || 0;
            
            this.enemies = init.enemies || [];
            for(let i = 0; i < this.enemies.length; i++) {
                this.enemies[i] = new Enemy(this.enemies[i]);
            }

            this.sZone = Symbol();
            this[this.sZone] = zone;
        }
    
        init() {
            this.emit("enemiesRemoved");
            this.emit("enemiesAdded", this.enemies);
            this.emit("nextWaveStarted", this[this.sZone], this.wave, this.subWave, this.maxSubWave, this.highestWave, this.highestWaveSubWave, this.maxSubWaveCurrentWave, this[this.sZone].targetWave);
        }

        

        startNewRun(player) {
            this.timestampTimeElapsedInRun = 0;
            player.heal();
            player.removeRage();
            player.removeFrenzy();
    
            this.wave = 1;
            this.subWave = 0;
            this.maxSubWaveCurrentWave = Battle.getMaxSubWave(this.wave, this.maxSubWave, this.highestWave);
            this.nextWave();
        }
    
        nextWave() {
            if(this[this.sZone].ended)
                return false;
                
            if(this.subWave < this.maxSubWaveCurrentWave)
                this.subWave++;
            else {
                this.subWave = 0;
                this.wave += 1;

                this.maxSubWaveCurrentWave = Battle.getMaxSubWave(this.wave, this.maxSubWave, this.highestWave);
            }
    
            this.emit("enemiesRemoved");
            this.enemies.splice(0, this.enemies.length);

            this.emit("nextWaveStarted", this[this.sZone], this.wave, this.subWave, this.maxSubWave, this.highestWave, this.highestWaveSubWave, this.maxSubWaveCurrentWave, this[this.sZone].targetWave);

            let zone = this[this.sZone];
            if(zone.targetWave != null && this.wave >= zone.targetWave) {
                zone.end();

                return false;
            }

            let randomOffset = Math.ceil(this.wave / 10);
            let random = Utility.getRandomInt(1 + randomOffset, 7 + randomOffset);

            let maxX = 80;
            let maxY = 70;

            let coordinates = [];
            for(let i = 0; i <= maxX; i+=20)
                for(let j = 0; j <= maxY; j+=10)
                    coordinates.push([i, j]);

            for(let i = 0; i < random; i++) {
                let hp = Math.floor(Math.triangular((this.wave) / 10) * 100);
                let damage = (Math.triangular((this.wave) / 10) * 10);
    
                let damageSpeed = Utility.getRandomInt(4, 21) / 10;
                damage = damage * damageSpeed;

                hp = Math.ceil(Utility.getRandomInt(hp / 2, hp * 2));

                let screenX = 0;
                if(coordinates.length > 0) {
                    let index = Utility.getRandomInt(0, coordinates.length);
                    let coords = coordinates[index];
                    coordinates.splice(index, 1);

                    screenX = coords[0] + Utility.getRandomInt(0, 7) - 3;
                    screenY = coords[1] + Utility.getRandomInt(0, 7) - 3;

                    if(screenX < 0) screenX = 0;
                    if(screenX > maxX) screenX = maxX;
                    if(screenY < 0) screenY = 0;
                    if(screenY > maxY) screenY = maxY;
                }
                else {
                    screenX = Utility.getRandomInt(0, maxX+1);
                    screenY = Utility.getRandomInt(0, maxY+1);
                }

                let enemy = new Enemy({
                    id: i,
        
                    screenX:screenX,
                    screenY:screenY,
        
                    health:hp,
                    maxHealth:hp,
        
                    damage:damage,
                    damageSpeed:damageSpeed,
                });

                let statCeiling = Battle.getEnemyStatCeiling(this.wave, Object.keys(enemy.stats).length);

                let arr = [];
                for(let name in enemy.stats)
                    arr.push(Math.random());

                arr = Utility.convertRatioToAddToNumber(arr, statCeiling);

                let j = 0;
                for(let name in enemy.stats) {
                    enemy.stats[name] = Math.ceil(arr[j]);
                    j++;
                }        

                this.enemies.push(enemy);
            }
    
            this.enemies.sort((a, b) => {
                return b.screenY - a.screenY;
            });
    
            if(this.wave > this.highestWave) {
                this.highestWave = this.wave;
                this.highestWaveSubWave = 0;
            }

            if(this.wave === this.highestWave && this.subWave > this.highestWaveSubWave)
                this.highestWaveSubWave = this.subWave;
    
            this.emit("enemiesAdded", this.enemies);

            return true;
        }
    
        update(fixedDelta, player) {
            let zone = this[this.sZone];
            let zones = zone[zone.sZones];
            let zoneType = zones.getZoneType(zone);

            this.timestampTimeElapsedInRun += fixedDelta;

            let playerHealthBeforeUpdate = player.health;

            let equippedItems = [];

            let jl = player.inventory.length;
            for(let j = 0; j < jl; j++) {
                if(player.inventory[j]._inventory.id === Player.Inventory.EQUIPMENT)
                    equippedItems.push(player.inventory[j]);
            }

            let el = equippedItems.length;
            for(let j = 0; j < el; j++) {
                let item = equippedItems[j];
    
                if(item.damage > 0) {
                    let interval = 1000 * (1 / item.damageSpeed) * (-player.frenzy.value / (player.frenzy.max * 2) + 1);

                    item._battleClockSpeed += fixedDelta;
                    item._battleClockSpeedFinish = interval;
                    
                    if(item._battleClockSpeed >= interval) {
                        item._battleClockSpeed = 0;
        
                        let il = Math.min(this.enemies.length, item.reach);
                        if(il > 0)
                            player.addRage(1);
                        for(let i = 0; i < il; i++) {
                            let enemy = this.enemies[i];
                            
                            if(Math.random() < Battle.getDodge(enemy.stats.agi, player.stats.agi.total)) {
                                this.emit("enemyDodged", enemy, item._inventory.data);
                            }
                            else {
                                let enemyAtMaxHealth = enemy.health === enemy.maxHealth;
                                let damage = Battle.getDamage(item.damage, player.stats.str.total, enemy.stats.def) * (player.frenzy.value / player.frenzy.max + 1);
                                enemy.health -= damage;
                                this.emit("enemyDamaged", enemy, damage, item._inventory.data);
        
                                if(enemy.health <= 0) {
                                    if(enemyAtMaxHealth)
                                        player.addFrenzy(1);

                                    this.enemies.splice(i, 1);
                                    i--;
                                    il--;
                                    this.emit("enemiesRemoved", [enemy]);

                                    let offsetOffset = zone.modules.auras.getAllMultipliersOfActiveAuras(Aura.RARITY_CHANCE_INCREASED);
                                    if(offsetOffset.length > 0)
                                        offsetOffset = offsetOffset.reduce((a, b) => a + b) * 10;
                                    else
                                        offsetOffset = 0;
                                    
                                    player.xp += Math.ceil(this.wave / 10);
                                    player.addItem(new Item().generateRandom(zoneType, this.wave, null, null, offsetOffset));

                                    player.updateStats();
                    
                                    if(this.enemies.length === 0)
                                        this.nextWave();
                                }
                                else {
                                    player.removeFrenzy(2);
                                }
                            }
                        }
                    }
                }

                if(item.regen > 0) {
                    let interval = 1000 * (1 / item.regenSpeed);

                    item._battleClockRegenSpeed += fixedDelta;
                    item._battleClockRegenSpeedFinish = interval;
                
                    if(item._battleClockRegenSpeed >= interval) {
                        item._battleClockRegenSpeed = 0;

                        player.heal(item.regen);
                    }
                }
            }
    
            let l = this.enemies.length;
            for(let i = 0; i < l; i++) {
                let enemy = this.enemies[i];
    
                let enemyInterval = Battle.getEnemyInterval(enemy.damageSpeed, enemy.stats.agi, player.stats.agi.total);
    
                enemy._battleCoordinatorClockSelf += fixedDelta;
                enemy._battleCoordinatorClockSelfFinish = enemyInterval;
    
                if(enemy._battleCoordinatorClockSelf >= enemyInterval) {
                    enemy._battleCoordinatorClockSelf = 0;
                    
                    if(Math.random() < Battle.getDodge(player.stats.agi.total, enemy.stats.agi)) {
                        this.emit("playerDodged", player);
                    }
                    else {
                        player.health -= Battle.getDamage(enemy.damage, enemy.stats.str, player.stats.def.total);
                        player.removeRage(2);

                        if(player.health <= 0) {
                            console.game(console.INFO, "⚔! [" + (zoneType === 0 ? "Main" : zoneType === 1 ? "Quest" : "Limbo") + "] [" + this.wave + "." + this.subWave + "] [" + Utility.getFormattedTime(this.timestampTimeElapsedInRun) + "]");
                            this.startNewRun(player);
                            return;
                        }
                    }
                }
    
                this.emit("enemyUpdated", enemy);
            }
    
            this.emit("playerUpdated", player, (player.health - playerHealthBeforeUpdate));
        }
    
        static getEnemyInterval(enemySpeed, enemySPD, playerSPD) {
            let enemySpeedMult = 1;
            /*if(enemySPD > playerSPD)
                enemySpeedMult = 1 + (enemySPD - playerSPD) / 10;
            else if(enemySPD < playerSPD)
                enemySpeedMult = 1 / (1 + ((playerSPD - enemySPD) / 10));*/
    
            return 1 / ((1 / enemySpeed) * enemySpeedMult) * 1000;
        }
    
        static getDamage(base, mySTR, theirDEF) {
            let mult = Math.pow(64, mySTR / (mySTR + theirDEF) - 0.5);

            return base * mult;
        }

        static getDodge(myAGI, theirAGI) {
            let dodge = 0;
            if(myAGI > theirAGI)
                dodge = 1 - 1 / Math.pow(64, myAGI / (myAGI + theirAGI) - 0.5);

            return dodge;
        }

        static getMaxSubWave(wave, maxSubWave, highestWave) {
            let value = -highestWave + 10 + maxSubWave + wave;

            if(value < 1)
                value = 1;
            else if(value > maxSubWave)
                value = maxSubWave;

            return value
        }

        static getEnemyStatCeiling(wave, statCount) {
            //initial offset   +  rarity offset           +  level offset
            return (25 * 3 * statCount) + Math.ceil((wave / 10) * 25 * statCount) + (wave * statCount);
        }

        getQuestMaxLevel() {
            return Math.floor(this.highestWave / 10) * 10;
        }
    }
})(null, null);