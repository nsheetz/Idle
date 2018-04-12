const Auras = ((window, document) => {
    "use strict";

    class Auras extends EventEmitter {
        constructor(init, zone) {
            super();

            init = init || {};

            init.auras = init.auras || [];
            this.auras = [];

            let l = init.auras.length;
            for(let i = 0; i < l; i++)
                this.auras[i] = new Aura(init.auras[i]);

            this.sZone = Symbol();
            this[this.sZone] = zone;
        }

        init() {
            this.emit("aurasChanged", this[this.sZone], true);
        }

        update(frameTime) {
            let removedAura = false;

            let l = this.auras.length;
            for(let i = 0; i < l; i++) {
                let aura = this.auras[i];
                aura.timeLeft -= frameTime;

                if(aura.timeLeft <= 0) {
                    this.auras.splice(i, 1);
                    i--;
                    l--;
                    removedAura = true;
                }

            }

            this.emit("aurasChanged", this[this.sZone], removedAura);
        }

        addAura(id, duration, data) {
            this.auras.push(new Aura({
                id: id,
                timeLeft: duration,
                data: data,
            }));

            this.emit("aurasChanged", this[this.sZone], true);
        }

        removeAllAuras() {
            this.auras.splice(0, this.auras.length);
            this.emit("aurasChanged", this[this.sZone], true);
        }

        getAllMultipliersOfActiveAuras(id) {
            let dataArr = [];

            let l = this.auras.length;
            for(let i = 0; i < l; i++) {
                let aura = this.auras[i];
                if(aura.id === id) {
                    dataArr.push(aura.data);
                }
            }

            return dataArr;
        }
    }

    return Auras;
})(null, null);

