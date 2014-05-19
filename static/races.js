var races = {
    dwarf: {
        st: 7,
        dx: 2,
        hp: 20,
        mn: 5,
        iq: 3,
        speed: 5,
        abilities: [{
            name: "thickSkin",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "buff",
                xdmg: 10
            }
        }, {
            name: "slow",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "debuff",
                dodgeChance: -10
            }
        }]
    },
    elf: {
        st: 5,
        dx: 10,
        hp: 10,
        mn: 10,
        iq: 7,
        speed: 7,
        abilities: [{
            name: "keenEyes",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "buff",
                hitChance: 10
            }
        }, {
            name: "tangle",
            type: "passive",
            target: "self",
            range: 0,
            chance: 5,
            effect: {
                type: "debuff",
                rof: -25,
                xdmg: 10
            }
        }]
    },
    gnome: {
        st: 4,
        dx: 4,
        hp: 10,
        mn: 15,
        iq: 10,
        speed: 6,
        abilities: [{
            name: "short",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "buff",
                dodgeChance: 10
            }
        }, {
            name: "short",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "debuff",
                xdmg: 4
            }
        }]
    },
    human: {
        st: 6,
        dx: 6,
        hp: 15,
        mn: 7,
        iq: 7,
        speed: 6,
        abilities: [{
            name: "adaptable",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "buff",
                dodgeChance: 10,
                hitChance: 5
            }
        }, {
            name: "egotistic",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "debuff",
                teamBuffx: -15
            }
        }]
    },
    goblin: {
        st: 7,
        dx: 10,
        hp: 12,
        mn: 0,
        iq: 2,
        speed: 5,
        abilities: [{
            name: "nimble",
            type: "passive",
            target: "self",
            range: 0,
            effect: {
                type: "debuff",
                counterChance: 15
            }
        }, {
            name: "charge",
            type: "active",
            target: "tile",
            range: 3,
            effect: {
                type: "teleport",
                uses: 1
            }
        }]
    }
};

if(typeof exports !== "undefined") {
    module.exports = races;
}