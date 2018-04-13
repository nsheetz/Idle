const Village = ((window, document) => {
    "use strict";

    class Village extends EventEmitter {
        constructor(init) {
            super();
            
            init = init || {};

            this.today = init.today || 0;
            this.aurasRemaining = init.aurasRemaining || 0;
        }

        init() {

        }

        update(frameTime) {
            let date = new Date();
            let today = new Date(this.today);

            if(date.getUTCDate() !== today.getUTCDate() || date.getUTCMonth() !== today.getUTCMonth() || date.getUTCFullYear() !== today.getUTCFullYear()) {
                this.today = date.getTime();
                this.aurasRemaining = 5;
                console.game(console.INFO, "A new set of Quests is now available!");
            }
        }
    }

    return Village;
})(null, null);

