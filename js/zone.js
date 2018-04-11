const Zone = ((window, document) => {
    "use strict";

    class Zone extends EventEmitter {
        constructor(init, zones) {
            super();

            init = init || {};

            this.targetWave = init.targetWave || null;
            this.ended = init.ended || false;
            this.rewardItemRarity = init.rewardItemRarity || 0;

            this.player = new Player(init.player, this);
            this.battle = new Battle(init.battle, this);

            this.player.defineEvents(["itemsChanged", "itemRerolled", "statsUpdated", "rageChanged", "frenzyChanged"]);
            this.battle.defineEvents(["enemiesRemoved", "enemiesAdded", "nextWaveStarted", "enemyDodged", "enemyDamaged", "playerDodged", "playerUpdated"]);

            for(let event in this.player._events) {
                this.player.on(event, function() {
                    this.emit(event, ...arguments);
                }.bind(this));
            }

            for(let event in this.battle._events) {
                this.battle.on(event, function() {
                    this.emit(event, ...arguments);
                }.bind(this));
            }

            this.sZones = Symbol();
            this[this.sZones] = zones;
        }

        init() {
            this.player.init();
            this.battle.init();
        }

        update(frameTime) {
            if(!this.ended)
                this.battle.update(frameTime, this.player);
        }

        end() {
            this.ended = true;

            this[this.sZones].zoneEnded(this);
        }
    }
    return Zone;
})(null, null);

