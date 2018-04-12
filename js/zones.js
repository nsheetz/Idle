const Zones = ((window, document) => {
    "use strict";

    class Zones extends EventEmitter {
        constructor(init) {
            super();
            
            init = init || {};

            this.focusedZoneIndex = init.focusedZoneIndex || 0;

            init.zones = init.zones || [];
            this.zones = [];

            this.zones[Zones.MAIN] = new Zone(init.zones[Zones.MAIN] || {}, this);

            if(init.zones[Zones.QUEST] != null) {
                this.zones[Zones.QUEST] = new Zone(init.zones[Zones.QUEST], this);
            }
        }

        init() {
            this.emit("focusedZoneChanged", this.zones[this.focusedZoneIndex]);
            this.zones[this.focusedZoneIndex].init();

            if(this.zones[Zones.QUEST] != null) {
                for(let name in this.zones[Zones.QUEST].modules) {
                    this.zones[Zones.QUEST].modules[name]._events = this.zones[Zones.MAIN].modules[name]._events;
                }
            }

            this.disableEvents();
            this.enableEvents();
        }

        update(frameTime) {
            let l = this.zones.length;
            for(let i = 0; i < l; i++) {
                this.zones[i].update(frameTime);
            }
        }

        getFocusedZone() {
            return this.zones[this.focusedZoneIndex];
        }

        getZoneType(zone) {
            return this.zones.indexOf(zone);
        }

        createNewQuest(targetWave, rewardItemRarity) {
            this.zones[Zones.QUEST] = new Zone({
                targetWave: targetWave,
                rewardItemRarity: rewardItemRarity,
            }, this);

            for(let name in this.zones[Zones.QUEST].modules) {
                this.zones[Zones.QUEST].modules[name]._events = this.zones[Zones.MAIN].modules[name]._events;
            }
        }

        changeFocusedZone(index) {
            if(this.zones[index] == null) {
                console.warn(this, "changeFocusedZone", "Zone does not exist");
                return false;
            }

            let catchingUp = true;

            loop:
            for(let i = 0; i < this.zones.length; i++) {
                for(let name in this.zones[i].modules) {
                    let module = this.zones[i].modules[name];

                    if(!module._eventsDisabled) {
                        catchingUp = false;
                        break loop;
                    }
                }
            }

            if(!catchingUp)
                this.disableEvents();

            this.focusedZoneIndex = index;

            if(!catchingUp)
                this.enableEvents();

            
            this.emit("focusedZoneChanged", this.zones[this.focusedZoneIndex]);
            return true;
        }

        zoneEnded(zone) {
            if(!(zone instanceof Zone)) {
                console.warn(this, "zoneEnded", "called on non-Zone");
                return false;
            }

            let index = this.zones.indexOf(zone);

            if(index < 0) {
                console.warn(this, "zoneEnded", "Zone does not exist");
                return false;
            }

            if(index === 0) {
                console.warn(this, "zoneEnded", "Not allowed to remove Zone 0");
                return false;
            }

            this.zones[Zones.MAIN].modules.player.addItem(new Item().generateRandom(Zones.MAIN, null, zone.rewardItemRarity));
            this.zones[Zones.MAIN].modules.player.addItem(new Item().generateRandom(Zones.MAIN, null, zone.rewardItemRarity));
            
            this.emit("zoneEnded", zone);
            
            return this.changeFocusedZone(0);
        }

        disableEvents() {
            EventEmitter.prototype.disableEvents.apply(this);

            let l = this.zones.length;
            for(let i = 0; i < l; i++) {
                let zone = this.zones[i];

                for(let name in zone.modules) {
                    zone.modules[name].disableEvents();
                }
            }
        }

        enableEvents() {
            EventEmitter.prototype.enableEvents.apply(this);

            let zone = this.getFocusedZone();
            for(let name in zone.modules) {
                zone.modules[name].enableEvents();
            }
        }
    }

    Zones.MAIN = 0;
    Zones.QUEST = 1;

    return Zones;
})(null, null);

