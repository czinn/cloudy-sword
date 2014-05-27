var classes = {
    wizard: {
        abilities: [
            {
                name: "Poke",
                type: "melee",
                target: "enemy",
                action: {
                    damage: "st+5*r"
                }
            },
            {
                name: "Fireball",
                type: "ranged",
                target: "enemy",
                range: 10,
                action: {
                    damage: "iq+5*r"
                }
            },
            {
                name: "Heal",
                type: "melee",
                target: "ally",
                action: {
                    heal: "iq/2+3*r"
                }
            }
        ]
    }
}

if(typeof exports !== "undefined") {
    module.exports = classes;
}