const Player = ((window, document) => {
    "use strict";

    class Player extends EventEmitter {
        static get Stat() {
            return class Stat {
                constructor(init) {
                    if(init != null) {
                        this.total = init.total;
            
                        this.level = init.level;
                        this.item = init.item;
                        this.trained = init.trained;
                    }
                    else {
                        this.empty();
                    }
                }
            
                empty() {
                    this.total = 0;
            
                    this.level = 0;
                    this.item = 0;
                    this.trained = 0;
            
                    return this;
                }
            
                calculateTotal() {
                    this.total = this.level + this.item + this.trained;
            
                    return this;
                }
            }
        }
        
        constructor(init, zone) {
            super();
    
            init = init || {};
    
            this.level = init.level || 1;
            this.xp = init.xp || 0;
            this.gold = init.gold || 0;
    
            this.health = init.health || 0;
            this.maxHealth = init.maxHealth || 0;
    
            this.damage = init.damage || 0;
            this.reach = init.reach || 0;

            init.stats = init.stats || {};
            this.stats = {};
            this.stats.str = new Player.Stat(init.stats.str);
            this.stats.def = new Player.Stat(init.stats.def);
            this.stats.agi = new Player.Stat(init.stats.agi);

            init.rage = init.rage || {}
            this.rage = {};
            this.rage.value = init.rage.value || 0;
            this.rage.max = init.rage.max || 0;

            init.frenzy = init.frenzy || {}
            this.frenzy = {};
            this.frenzy.value = init.frenzy.value || 0;
            this.frenzy.max = init.frenzy.max || 0;

            this.weights = init.weights || [];

            this.inventory = init.inventory || [];
            for(let i = 0; i < this.inventory.length; i++) {
                this.inventory[i] = new Item(this.inventory[i]);
            }

            this.lastGoldEarned = init.lastGoldEarned || 0;

            this.sZone = Symbol();
            this[this.sZone] = zone;
        }
    
        init() {
            this.emit("itemsChanged", this, this.inventory, true);

            this.updateStats();
        }

        getItemInventoryIndex(item, logData) {
            if(!(item instanceof Item)) {
                console.warn(this, logData, "called on non-Item");
                return null;
            }

            if(item._deleted) {
                console.warn(this, logData, "Item has already been deleted");
                return null;
            }

            let index = this.inventory.indexOf(item);
            if(index < 0) {
                console.log(this, logData, "Item is not in Player's inventory");
                return null;
            }

            return index;
        }
        
        addItem(item) {
            if(!(item instanceof Item)) {
                console.warn(this, "addItem", "called on non-Item");
                return false;
            }
    
            let index = this.inventory.indexOf(item);
            if(index > -1) {
                console.log(this, "addItem", "Item is already in Player's inventory");
                return false;
            }
    
            item._deleted = false;
            item._inventory.id = Player.Inventory.INVENTORY;
            item._inventory.data = null;
    
            this.inventory.push(item);
            this.emit("itemsChanged", this, [item], false);
    
            if(this.inventory.length > 36 + 5 + 6)
                this.destroyWeakItems();
            return true;
        }

        moveItem(item, id, data) {
            let index = this.getItemInventoryIndex(item, "moveItem");
            if(index == null)
                return false;

            item._inventory.id = id;
            item._inventory.data = data;
            this.emit("itemsChanged", this, item, false);

            return true;
        }

        rerollItem(item, rolls) {
            let zone = this[this.sZone];
            let zones = zone[zone.sZones];
            let zoneType = zones.getZoneType(zone);

            let cost = Item.getRerollCost(item.rarity, rolls);

            if(this.gold < cost) {
                console.game(console.INFO, "Not enough gold to reroll item.");
                return false;
            }

            let originalValue = item.getValue(this.weights);

            let value = 0;
            let newItem = null;

            for(let i = 0; i < rolls; i++) {
                item.generateRandom(zoneType, null, item.rarity, item.type);
                let newValue = item.getValue(this.weights);
                if(newValue >= value) {
                    value = newValue;
                    newItem = new Item(item);   
                }
            }

            if(this.replaceItem(item, newItem)) {
                this.gold -= cost;
                this.updateStats();
                this.emit("itemRerolled", originalValue, value, [item, newItem]);
                this.sortInventory();
                return true;
            }
            return false;
        }

        replaceItem(item, newItem) {
            let index = this.getItemInventoryIndex(item, "moveItem");
            if(index == null)
                return false;
            
            if(!(newItem instanceof Item)) {
                console.warn(this, "replaceItem", "called on non-Item (arg 1)");
                return false;
            }

            item._deleted = true;
            newItem._inventory = item._inventory;
            this.inventory[index] = newItem;

            this.updateStats();
            this.emit("itemsChanged", this, [item, newItem], false);

            return true;
        }
        
        backpackItem(item) {
            let index = this.getItemInventoryIndex(item, "backpackItem");
            if(index == null)
                return false;

            if(item._inventory.id === Player.Inventory.BACKPACK) {
                item._inventory.id = Player.Inventory.INVENTORY;
                item._inventory.data = null;
            }
            else {
                let l = this.inventory.length;
                let totalInBackpack = 0;
                for(let i = 0; i < l; i++) {
                    if(this.inventory[i]._inventory.id === Player.Inventory.BACKPACK)
                        totalInBackpack++;
                }

                if(totalInBackpack >= 6) {
                    console.game(console.INFO, "Backpack reached capacity: 6");
                    return false;
                }

                item._equipped = false;
                item._inventory.id = Player.Inventory.BACKPACK;
                item._inventory.data = null;
            }
    
            this.updateStats();
            this.emit("itemsChanged", this, item, false);

            return true;
        }

        equipItem(item, slot) {
            let index = this.getItemInventoryIndex(item, "equipItem");
            if(index == null)
                return false;
    
            if(!(slot >= 0)) {
                console.warn(this, "equipItem", "Can't equip item to slot: " + slot);
                return false;
            }

            let items = [];
            items.push(item);

            let equipped = this.inventory.find(item => item._inventory.id === Player.Inventory.EQUIPMENT && item._inventory.data === slot);
            if(equipped != null) {
                if(equipped._inventory.id === item._inventory.id && equipped._inventory.data === item._inventory.data) {
                    this.unequipItem(item);
                    return;
                }
                
                equipped._inventory.id = item._inventory.id;
                equipped._inventory.data = item._inventory.data;

                if(equipped._inventory.id !== Player.Inventory.EQUIPMENT) {
                    equipped._battleClockSpeed = 0;
                    equipped._battleClockRegenSpeed = 0;
                }

                items.push(equipped);
            }

            item._inventory.id = Player.Inventory.EQUIPMENT;
            item._inventory.data = slot;
    
            this.updateStats();
            this.emit("itemsChanged", this, items, false);
            return true;
        }
    
        unequipItem(item) {
            let index = this.getItemInventoryIndex(item, "unequipItem");
            if(index == null)
                return false;
    
            item._inventory.id = Player.Inventory.INVENTORY;
            item._inventory.data = null;

            item._battleClockSpeed = 0;
            item._battleClockRegenSpeed = 0;
    
            this.updateStats();
            this.emit("itemsChanged", this, item, false);
            return true;
        }
    
        updateStats() {
            if(this.xp >= this.getCurrentMaxXP()) {
                this.xp = 0;
                this.level += 1;
            }

            for(let name in this.stats)
                this.stats[name].empty();
    
            this.damage = 0;
            this.reach = 0;
    
            this.maxItemsEquipped = 2;
            this.maxHealth = 10;

            this.rage.max = 100;
            this.frenzy.max = 100;

            let dps = 0;
            let rps = 0;
            
            let l = this.inventory.length;
            for(let i = 0; i < l; i++) {
                let item = this.inventory[i];

                if(item._inventory.id !== Player.Inventory.EQUIPMENT)
                    continue;
    
                this.damage += item.damage;
                this.reach += item.reach;
                this.maxHealth += item.health;

                dps += item.damage * item.reach * item.damageSpeed;
                rps += item.regen * item.regenSpeed;

                for(let name in this.stats)
                    this.stats[name].item += item.stats[name];
            }
            
            for(let name in this.stats) {
                this.stats[name].level += this.level;
                this.stats[name].trained = 60;
            }

            for(let name in this.stats)
                this.stats[name].calculateTotal();
    
            if(this.health > this.maxHealth)
                this.health = this.maxHealth;

            //[dps,hp,rps,str,def,agi,hwe]
            this.weights = Player.getWeights([dps, this.maxHealth, rps, this.stats.str.total, this.stats.def.total, this.stats.agi.total, this[this.sZone].modules.battle.highestWave]);
            
            this.emit("statsUpdated", this);
            return true;
        }

        addRage(amt) {
            let rage = this.rage;

            if(amt == null) {
                rage.value = rage.max;
            }
            else {
                rage.value += amt;
                if(rage.value > rage.max)
                    rage.value = rage.max;
            }

            this.emit("rageChanged", rage.value, rage.max, rage.threshold);
        }

        removeRage(amt) {
            let rage = this.rage;
            
            if(amt == null) {
                rage.value = 0;
            }
            else {
                rage.value -= amt;
                if(rage.value < 0)
                    rage.value = 0;
            }

            this.emit("rageChanged", rage.value, rage.max, rage.threshold);
        }

        addFrenzy(amt) {
            let frenzy = this.frenzy;

            if(amt == null) {
                frenzy.value = frenzy.max;
            }
            else {
                frenzy.value += amt;
                if(frenzy.value > frenzy.max)
                    frenzy.value = frenzy.max;
            }

            this.emit("frenzyChanged", frenzy.value, frenzy.max, frenzy.threshold);
        }

        removeFrenzy(amt) {
            let frenzy = this.frenzy;
            
            if(amt == null) {
                frenzy.value = 0;
            }
            else {
                frenzy.value -= amt;
                if(frenzy.value < 0)
                    frenzy.value = 0;
            }

            this.emit("frenzyChanged", frenzy.value, frenzy.max, frenzy.threshold);
        }

        heal(amt) {
            if(amt == null)
                this.health = this.maxHealth;
            else
                this.health += amt;
            
            this.updateStats();
        }
    
        sortInventory() {
            this.inventory.sort((a, b) => {
                return (
                    a.type - b.type || b.getValue(this.weights) - a.getValue(this.weights)
                );
            });
    
            this.emit("itemsChanged", this, this.inventory, true);
        }

        sellItem(item) {
            let index = this.getItemInventoryIndex(item, "sellItem");
            if(index == null)
                return false;

            this.gold += item.getSaleGoldValue();

            item._deleted = true;
            this.emit("itemsChanged", this, [item], false);
            this.inventory.splice(index, 1);

            this.updateStats();
            return true;
        }
    
        destroyWeakItems() {
            this.sortInventory();

            let ignoreThresholdWeapon = 12;
            let ignoreThresholdArmor = 12;

            let l = this.inventory.length;
            for(let i = 0; i < l; i++) {
                let item = this.inventory[i];
                if(item._inventory.id === Player.Inventory.INVENTORY) {
                    if(item.type === Item.Type.WEAPON) {
                        ignoreThresholdWeapon--;
                        if(ignoreThresholdWeapon < 0 && this.sellItem(item)) {
                            i--;
                            l--;
                        }
                    }
                    else if(item.type === Item.Type.ARMOR) {
                        ignoreThresholdArmor--;
                        if(ignoreThresholdArmor < 0 && this.sellItem(item)) {
                            i--;
                            l--;
                        }
                    }
                }
            }
        }
    
        getCurrentMaxXP() {
            return this.level * 1000;
        }

        static getGoldCostOfQuestRarityChanceAuraMultiplier(targetZone, mult) {
            return 200000 * Math.pow(10, targetZone / 10) * (mult - 1);
        }

        //https://pastebin.com/SjhBJSzD/
        // stats = [dps,hp,rps,str,def,agi,hwe];
        static getWeights(stats){const VF=1.01;const DEFAULT_WEIGHTS=[0.01,0.002,0.1,0.02,0.02,0.02];let base=Player.statScore(stats);if(!Number.isFinite(base)){return DEFAULT_WEIGHTS}
            let weights=[];for(let i=0;i<(stats.length-1);i++){let stat=stats[i];let testStat=stat*VF;if(stat===0){testStat=VF-1}
            stats[i]=testStat;let score=Player.statScore(stats);if(!Number.isFinite(score)){return DEFAULT_WEIGHTS}
            weights[i]=(score-base)/(testStat-stat);stats[i]=stat}
            return weights
        }
        static statScore(stats){let dps,hp,rps,str,def,agi,hwe;[dps,hp,rps,str,def,agi,hwe]=stats;let v=hwe/10;let statAvg=75+35*v;let statCap=3*statAvg;let A=agi/statCap;let A2=A*A;let A3=A2*A;let pA=A+A2
            if(A>1/3){pA=(5/2)*(A-(1/2)*A2-1/10)}
            let pB=1-pA;let eBltA=(1/pA)*((1/2)*A2+(2/3)*A3);if(A>1/3){eBltA=(1/pA)*(-1/36+(5/2)*((1/2)*A2-(1/3)*A3))}
            let eBgtA=(1/pB)*(7/18-(1/2)*A2-(2/3)*A3);if(A>1/3){eBgtA=(1/pB)*(5/12+(5/2)*((1/3)*A3-(1/2)*A2))}
            eBltA*=statCap;eBgtA*=statCap;A*=statCap;let enemyDPSMultAgi=1-pA*(1-Math.pow(8,(eBltA-A)/(eBltA+A)));let enemyHPMultAgi=1/(1-pB*(1-Math.pow(8,(A-eBgtA)/(A + eBgtA)) ) );
            let enemyDPSMultStr=Math.pow(8,(statAvg-def)/(statAvg+def));let enemyHPMultDef=Math.pow(8,(statAvg-str)/(statAvg+str));let vG=v*(v+1)*(v+5)/2;let cHP=20*100*1.25;let cDPS=10/2;let eHP=enemyHPMultAgi*enemyHPMultDef*cHP*vG;let eDPS=enemyDPSMultAgi*enemyDPSMultStr*cDPS*vG;let v2=v*v;let v3=v2*v;let vp1=3*v2+12*v+5;let vp2=Math.log(8)*(v3+6*v2+5*v)*70;let dHP=(1/10)*enemyHPMultAgi*enemyHPMultDef*cHP/2*(vp1+vp2*str/Math.pow((statAvg+str),2));let dDPS=(1/10)*enemyDPSMultAgi*enemyDPSMultStr*cDPS/2*(vp1+vp2*def/Math.pow((statAvg+def),2));let qA=dHP*dDPS;let qB=(eDPS-rps)*dHP+eHP;let qC=(eDPS-rps)*eHP-hp*dps;let dW=(1/(2*qA))*(-qB+Math.sqrt(qB*qB-4*qA*qC));return hwe+dW
        }
    }

    const Inventory = Object.freeze({
        INVENTORY: 0,
        EQUIPMENT: 1,
        BACKPACK: 2,
    });

    Player.Inventory = Inventory;

    return Player;
})(null, null);
