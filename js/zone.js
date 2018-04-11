const Zone = ((window, document) => {
    "use strict";

    class Zone {
        constructor(init, zones) {
            init = init || {};

            this.targetWave = init.targetWave || null;
            this.ended = init.ended || false;
            this.rewardItemRarity = init.rewardItemRarity || 0;

            init.modules = init.modules || {};
            this.modules = {
                player : new Player(init.modules.player, this),
                battle : new Battle(init.modules.battle, this),
            }
            
            this.sZones = Symbol();
            this[this.sZones] = zones;
        }

        init() {
            for(let name in this.modules) {
                this.modules[name].init();
            }
        }

        update(frameTime) {
            if(!this.ended)
                this.modules.battle.update(frameTime, this.modules.player);
        }

        end() {
            this.ended = true;

            this[this.sZones].zoneEnded(this);
        }
    }
    return Zone;
})(null, null);

