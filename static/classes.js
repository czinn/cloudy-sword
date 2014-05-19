var classes = {
    wizard: {
        abilities: [
            {
                name: "poke",
                type: "melee",
                action: {
                    damage: "st+5*r"
                }
            },
            {
                name: "fireball",
                type: "ranged",
                range: 10,
                action: {
                    damage: "iq+5*r"
                }
            }
        ]
    }
}

if(typeof exports !== "undefined") {
    module.exports = classes;
}