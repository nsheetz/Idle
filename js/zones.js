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
                this.zones[Zones.QUEST]._events = this.zones[Zones.MAIN]._events;
            }
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

            this.zones[Zones.QUEST]._events = this.zones[Zones.MAIN]._events;
        }

        changeFocusedZone(index) {
            if(this.zones[index] == null) {
                console.warn(this, "changeFocusedZone", "Zone does not exist");
                return false;
            }

            let disabled = this._eventsDisabled;
            if(!disabled)
                this.disableEvents();

            this.focusedZoneIndex = index;

            if(!disabled)
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

            this.zones[Zones.MAIN].player.addItem(new Item().generateRandom(Zones.MAIN, null, zone.rewardItemRarity));

            return this.changeFocusedZone(0);
        }

        disableEvents() {
            EventEmitter.prototype.disableEvents.apply(this);

            let l = this.zones.length;
            for(let i = 0; i < l; i++) {
                let zone = this.zones[i];

                zone.disableEvents();
            }
        }

        enableEvents() {
            EventEmitter.prototype.enableEvents.apply(this);

            this.getFocusedZone().enableEvents();
        }
    }

    Zones.MAIN = 0;
    Zones.QUEST = 1;

    return Zones;
})(null, null);

