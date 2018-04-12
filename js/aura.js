const Aura = ((window, document) => {
    "use strict";

    class Aura {
        constructor(init) {
            init = init || {};

            this.id = init.id || Aura.NONE;
            this.timeLeft = init.timeLeft || 0;
            this.data = init.data || 0;
        }
    }

    Aura.NONE = 0;
    Aura.RARITY_CHANCE_INCREASED = 1;

    return Aura;
})(null, null);

