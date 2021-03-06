const Menu = ((window, document) => {
    "use strict";

    return class Menu extends EventEmitter {
        constructor(init, template, container) {
            super();

            init = init || {};

            this.sMenus = Symbol();
            this[this.sMenus] = [];

            this.sTemplate = Symbol();
            this[this.sTemplate] = template;

            this.sContainer = Symbol();
            this[this.sContainer] = container;
        }

        init() {
            this.update();
        }

        createVillage(village, player, battle, date, imageVillage, imageVillageLightmap, windowWidth, windowHeight, questCb) {
            let scaleX = Math.floor(windowWidth * 0.9 / 300);
            let scaleY = Math.floor(windowHeight * 0.9 / 188);
            let scale = Math.min(scaleX, scaleY);

            let width = 300 * scale;
            let height = 188 * scale;

            let description = "";
            description += "<canvas style='position:absolute;left:0;top:0'></canvas>";
            description += "<canvas style='position:absolute;left:0;top:0'></canvas>";
            description += "<canvas style='position:absolute;left:0;top:0'></canvas>";
            description += "<canvas style='position:absolute;left:0;top:0'></canvas>";
            description += "<div data-id='townHall' style='cursor:pointer;position:absolute;right:5%;bottom:10%;width:" + (60 * scaleX) + "px; height:" + (60 * scaleY) + "px'></div>";

            let menus = this[this.sMenus];
            
            menus.push({
                title: "Village",
                description: description,
                translateX: Math.floor(windowWidth / 2 - width / 2),
                translateY: Math.floor(windowHeight / 2 - height / 2),
                width: width + "px",
                height: height + "px",
                clock: 1000*60,

                update: (function(frameTime) {
                    this.clock += frameTime;
                    if(this.clock < 1000*60)
                        return;

                    this.clock = 0;

                    let elem = this.elem;

                    let canvases = Array.from(elem.querySelectorAll("canvas"));
                    for(let i = 0; i < canvases.length; i++) {
                        let canvas = canvases[i];
                        let ctx = canvas.getContext("2d");
                        canvas.width = width;
                        canvas.style.width = width + "px";
                        canvas.height = height;
                        canvas.style.height = height + "px";
    
                        ctx.imageSmoothingEnabled = false;
                        ctx.scale(scale, scale);
                    }
    
                    let canvas, ctx;
    
                    canvas = canvases[0];
                    ctx = canvas.getContext("2d");
                    ctx.fillStyle = World.getSkyColorCSS(date);
                    ctx.fillRect(0, 0, width, height);
    
                    canvas = canvases[1];
                    ctx = canvas.getContext("2d");
                    
                    ctx.filter = "brightness(" + World.getVillageBrightnessPrc(date) + "%)";
                    ctx.drawImage(imageVillage, 0, 0);
    
                    canvas = canvases[2];
                    ctx = canvas.getContext("2d");
    
                    let hours = date.getHours();
                    if(hours >= 5 && hours <= 20)
                        ctx.clearRect(0, 0, width, height);
                    else
                        ctx.drawImage(imageVillageLightmap, 0, 0);
                }),
            });

            let elem = this.setup(menus.length - 1);

            elem.querySelector("[data-id=townHall]").onclick = () => {
                let description = "Greetings, you there! I'm the Mayor.<br><br>";

                description += "I have new Quests for you!<br>";

                let maxLevel = battle.getQuestMaxLevel();
                if(maxLevel < 1) {
                    description += "Unfortunately, you are not strong enough yet to go on Quests! Come back when you reach Wave 10.";
                }
                else {
                    description += "You have <span data-id=aurasRemaining></span> Auras left to get from Quests.<br>";
                    description += "New Auras available in <span data-id=newQuestsCountdown></span><br><br>";
                    description += "Select the strength of the Rarity Chance aura to apply to the Quest,<br>for a sum of <span class=icon-gold></span><br>";
                    description += "<input type='range' min='1' max='2' value='1' step='0.01'></input><br>";
                    description += "<span data-id=inputValue></span><br>";
                    description += "<button data-id=startQuest>Go on Quest <span class='icon-gold' data-id='gold'></span></button><br>";
                }

                let menu = {
                    title: "Town Hall",
                    description: description,
                    translateX: Math.floor(windowWidth / 2 - windowWidth * 0.15),
                    translateY: Math.floor(windowHeight / 2 - windowWidth * 0.1),
                    width: "30vw",
                    height: "20vw",
                    clock: 1000*60,
                    update: () => {
                        let textNewQuestsCountdown = elem.querySelector("[data-id=newQuestsCountdown]");
                        if(textNewQuestsCountdown != null) {
                            let today = new Date(village.today);
                            let tomorrow = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
                            tomorrow = tomorrow.getTime() + (1000*60*60*24);

                            textNewQuestsCountdown.innerHTML = Utility.getFormattedTime(tomorrow - Date.now());
                        }

                        let aurasRemaining = elem.querySelector("[data-id=aurasRemaining]");
                        if(aurasRemaining != null) {
                            aurasRemaining.innerHTML = village.aurasRemaining;
                        }
                    },
                };

                menus.push(menu);

                let elem = this.setup(menus.length - 1);

                if(!(maxLevel < 1)) {
                    let elemGold = elem.querySelector("[data-id=gold]");
                    let input = elem.querySelector("input");
                    let buttonStartQuest = elem.querySelector("[data-id=startQuest]");
                    let inputValue = elem.querySelector("[data-id=inputValue]");

                    let cost = 0;
                    input.oninput = function() {
                        if(this.value < 1) {
                            this.value = 1;
                        }
                        else if(this.value > 2) {
                            this.value = 2;
                        }
                        inputValue.innerHTML = Math.round((Number(this.value) - 1) * 100) + "%";
                        cost = Player.getGoldCostOfQuestRarityChanceAuraMultiplier(battle.getQuestMaxLevel(), this.value);
                        
                        elemGold.innerHTML = Utility.prettify(cost);

                        if(player.gold < cost)
                            buttonStartQuest.disabled = true;
                        else
                            buttonStartQuest.disabled = false;
                        
                    }

                    input.oninput();

                    buttonStartQuest.onclick = () => {
                        this.remove(menu);

                        questCb(input.value, cost);
                    }
                }
            }
        }

        createChangeValueWeights(player, windowWidth, windowHeight) {
            let description = '';
            description += "<div>Alter the weights for Item Value calculation here. 1 is default. Higher values = higher weight put towards this stat.</div>";
            description += "<div style='width:50%;position:relative; float:left; text-align:left'>";
            description +=      '<input style="width:50%" data-var="damage" type="number" step="0.01"></input> - Damage';
            description +=      '<input style="width:50%" data-var="damageSpeed" type="number" step="0.01"></input> - Attack Speed';
            description +=      '<input style="width:50%" data-var="reach" type="number" step="0.01"></input> - Reach';
            description += '</div>';
            description += "<div style='width:50%;position:relative; float:left; text-align:left'>";
            description +=      '<input style="width:50%" data-var="regen" type="number" step="0.01"></input> - Health Regen';
            description +=      '<input style="width:50%" data-var="regenSpeed" type="number" step="0.01"></input> - Health Regen Speed';
            description +=      '<input style="width:50%" data-var="health" type="number" step="0.01"></input> - Health';
            description += '</div>';
            description += '<hr>';
            description += '<input style="width:50%" data-var="playerStats" type="number" step="0.01"></input> - Player Stats';

            let elem = this.create(Math.floor(windowWidth / 2 - windowWidth * 0.15), Math.floor(windowHeight / 2 - windowWidth * 0.13),
                            "36vw", "auto", "Quantum Universe Alterator", description);

            let inputs = Array.from(elem.querySelectorAll("input[data-var]"));
            let l = inputs.length;
            for(let i = 0; i < l; i++) {
                let input = inputs[i];
                input.value = player.weights[input.dataset.var];

                input.onchange = function(e) {
                    let newMult = Number(this.value);
                    if(newMult > 0) {
                        player.weights[this.dataset.var] = newMult;
                    }
                }
            }
        }

        createItemReroll(x, y, item, player, cb) {
            let description = '';
            description += '<div style="height:60%;width:100%">Spend <span class="icon-gold"></span> to reroll your chosen item here.<br><br>Your item will receive a new set of stats, a specified number of times. The set with the highest total Item Value will be chosen as the final item.</div><br>';

            description += '<div style="height:40%;width:100%;position:relative">';
            description +=      '<input style="width:50%" type=number value=10 min=1><br>';
            description +=      '<span>Reroll <span data-value=true></span> times.</span><br>';
            description +=      '<button style="width:50%" class="icon-gold"></button>';
            description += '</div>';
            
            let elem = this.create(x, y - 300, "25vw", "15vw", "Forge", description);

            let slider = elem.querySelector("input[type=number]");
            let roll = elem.querySelector("span[data-value=true]");
            let button = elem.querySelector("button.icon-gold");

            slider.oninput = () => {
                let cost = Item.getRerollCost(item.rarity, 1);
                let maxRolls = Math.floor(player.gold / cost);
                maxRolls = Math.min(maxRolls, 1000000);

                if(slider.value > maxRolls)
                    slider.value = maxRolls;
                
                roll.innerHTML = slider.value;
                button.innerHTML = Utility.prettify(Item.getRerollCost(item.rarity, slider.value));

                if(Number(slider.value) === 0)
                    button.disabled = true;
                else
                    button.disabled = false;
            }

            slider.oninput();

            button.onclick = () => {
                cb(slider.value);

                let menus = this[this.sMenus];
                let menu = menus.find(menu => menu.elem === elem);
                menus.splice(menus.indexOf(menu), 1);

                elem.parentNode.removeChild(elem);
            }
        }

        createItem(x, y, item, player, cbEquip, cbReroll, cbSell, cbBackpack) {
            let menus = this[this.sMenus];
            let menu = menus.find(menu => menu.item === item);
            if(menu != null) {
                this.remove(menu);
                return;
            }

            let title = '<div style="width:100%;height:100%" class=item-rarity-' + item.rarity + '>Item Rarity: ' + item.rarity + '</span>';
            
            let buildStat = (name, stat, statMax, value) => {
                description += '<div style="position:relative; width:100%; height:1vw; line-height:1vw; margin-bottom:3px">';
                description += '<div class="icon-' + name + '" style="width:20%;height:100%;float:left"></div>';
                description += '<div class="progress-bar-outer" style="height:100%;width:60%;float:left;font-size:0.8vw;">';
                description +=      '<div class="progress-bar bg-' + name + '" style="width:' + (stat / statMax * 100) + '%"></div>';
                description +=      '<div class="progress-bar-text">' + Utility.prettify(stat) + "/" + Utility.prettify(statMax) + '</div>';
                description += '</div>';
                description += '<div style="width:20%;height:100%;float:left">' + Utility.prettify(value) + '</div>';
                description +=  '</div>';
            }
            
            let description = '';
            description +=  '<div style="width:100%;margin-top:1vw">Value: ' + Utility.prettify(item.getValue(player.weights)) + '</div>';
            description +=  '<div style="position:relative; width:calc(100% - 2vw);height:100%;margin: 1vw;margin-top:0">';
            
            description += "<hr>";

            if(item.type === Item.Type.WEAPON) {
                let value = item.damage;
                buildStat("damage", item.damage, item.getDamageRoll(true), value);

                value *= item.damageSpeed;
                buildStat("damagespeed", item.damageSpeed, item.getDamageSpeedRoll(true), "x"+value);

                value *= item.reach;
                buildStat("reach", item.reach, item.getReachRoll(true), "x"+value);

                
            }
            else if(item.type === Item.Type.ARMOR) {
                let value = item.regen;
                buildStat("regen", item.regen, item.getRegenRoll(true), value);

                value *= item.regenSpeed;
                buildStat("regenspeed", item.regenSpeed, item.getRegenSpeedRoll(true), "x"+value);

                value *= item.health;
                buildStat("health", item.health, item.getHealthRoll(true), "x"+value);
            }
            
            description += "<hr>";
            
            let maxStatRoll = item.getStatRoll(true);

            for(let name in item.stats) {
                buildStat(name, item.stats[name], maxStatRoll, (item.stats[name] / item.getStatRoll(true)* player.weights.playerStats) + "x");
            }

            description += "<hr>";

            if(item.type === Item.Type.WEAPON) {
                description += '<button data-item-equip=1 class=bg-' + (item._inventory.data === 1 ? "orange" : "green") + ' style="width:100%">' + (item._inventory.data === 1 ? "Remove from left hand" : "Equip in left hand") + '</button>';
                description += '<button data-item-equip=2 class=bg-' + (item._inventory.data === 2 ? "orange" : "green") + ' style="width:100%">' + (item._inventory.data === 2 ? "Remove from right hand" : "Equip in right hand") + '</button>';
            }
            else if(item.type === Item.Type.ARMOR) {
                description += '<button data-item-equip=3 class=bg-' + (item._inventory.data === 3 ? "orange" : "green") + ' style="width:100%">' + (item._inventory.data === 3 ? "Remove helmet" : "Equip helmet") + '</button>';
                description += '<button data-item-equip=4 class=bg-' + (item._inventory.data === 4 ? "orange" : "green") + ' style="width:100%">' + (item._inventory.data === 4 ? "Remove chestplate" : "Equip chestplate") + '</button>';
                description += '<button data-item-equip=5 class=bg-' + (item._inventory.data === 5 ? "orange" : "green") + ' style="width:100%">' + (item._inventory.data === 5 ? "Remove pants" : "Equip pants") + '</button>';
            }

            description += '<button data-item-backpack=true class=bg-gray style="width:100%">' + (item._inventory.id === Player.Inventory.BACKPACK ? "Remove from backpack" : "Move to backpack") + '</button>';
            description += '<button data-item-reroll=true class=bg-gray style="width:100%">Reroll</button>';
            description += '<button data-item-sell=true class=bg-yellow style="width:100%">Sell (<span class="icon-gold"></span>' + Utility.prettify(item.getSaleGoldValue()) + ')</button>';

            description +=  '</div>';
            menu = {
                title: title,
                description: description,
                translateX: x,
                translateY: y - 350,
                width: "15vw",
                height: "auto",

                item: item,
            };

            menus.push(menu);

            let elem = this.setup(menus.length - 1);

            let buttonReroll = elem.querySelector("button[data-item-reroll=true]");
            let buttonSell = elem.querySelector("button[data-item-sell=true]");
            let buttonBackpack = elem.querySelector("button[data-item-backpack=true]");
            let buttonsEquip = elem.querySelectorAll("button[data-item-equip]");

            buttonReroll.onclick = () => {cbReroll(); let index = menus.indexOf(menu); if(index >= 0) menus.splice(index, 1); elem.parentNode.removeChild(elem);}
            buttonSell.onclick = () => {cbSell(); let index = menus.indexOf(menu); if(index >= 0) menus.splice(index, 1); elem.parentNode.removeChild(elem);}
            buttonBackpack.onclick = () => {cbBackpack(); let index = menus.indexOf(menu); if(index >= 0) menus.splice(index, 1); elem.parentNode.removeChild(elem);}
            
            let l = buttonsEquip.length;
            for(let i = 0; i < l; i++) {
                let button = buttonsEquip[i];
                button.onclick = () => {
                    cbEquip(Number(button.dataset.itemEquip));

                    let index = menus.indexOf(menu);
                    if(index >= 0)
                        menus.splice(index, 1);
                    elem.parentNode.removeChild(elem);
                }
            }
        }

        create(x, y, width, height, title, description, update) {
            let menus = this[this.sMenus];
            
            menus.push({
                title: title,
                description: description,
                translateX: x,
                translateY: y,
                width: width,
                height: height,

                update: update
            });

            return this.setup(menus.length - 1);
        }

        remove(menu) {
            let menus = this[this.sMenus];
            
            menu.elem.parentNode.removeChild(menu.elem);
            menus.splice(menus.indexOf(menu), 1);
        }

        update(frameTime) {
            let menus = this[this.sMenus];
            let l = menus.length;
            for(let i = 0; i < l; i++) {
                if(typeof menus[i].update === "function") {
                    menus[i].update.bind(menus[i])(frameTime);
                }
            }
        }

        setup(index) {
            try {
                let menus = this[this.sMenus];
                let menu = menus[index];

                let container = this[this.sContainer];
                let template = this[this.sTemplate];

                let fragment = template.content.cloneNode(true);

                let elem = Array.prototype.slice.call(fragment.childNodes, 0)[1];
                menu.elem = elem;

                elem.style.width = menu.width;
                elem.style.height = "calc(" + menu.height + " + 1.5vw)";

                elem.querySelector(".menu-header").innerHTML = menu.title;
                elem.querySelector(".menu-content").innerHTML = menu.description;
                elem.style.transform = "translateX(" + menu.translateX + "px) translateY(" + menu.translateY + "px)";

                elem.querySelector(".menu-x").onclick = () => this.remove(menu);

                (() => {
                    let lastClientX = null;
                    let lastClientY = null;

                    elem.querySelector(".menu-header").onmousemove = function(e) {
                        if(e.buttons === 1) {
                            if(lastClientX == null || lastClientY == null) {
                                lastClientX = e.clientX;
                                lastClientY = e.clientY;
                                return;
                            }

                            menu.translateX += e.clientX - lastClientX;
                            menu.translateY += e.clientY - lastClientY;

                            elem.style.transform = "translateX(" + menu.translateX + "px) translateY(" + menu.translateY + "px)";

                            lastClientX = e.clientX;
                            lastClientY = e.clientY;
                        }
                        else {
                            lastClientX = null;
                            lastClientY = null;
                        }
                    }
                })();

                container.appendChild(elem);
                return elem;
            } catch(e) {console.error(e)}
        }
    }

})(null, null);

