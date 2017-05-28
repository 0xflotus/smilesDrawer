/** 
 * A class representing an atom.
 * 
 * @property {String} element The element symbol of this atom. Single-letter symbols are always uppercase. Examples: H, C, F, Br, Si, ...
 * @property {Boolean} drawExplicit A boolean indicating whether or not this atom is drawn explicitly (for example, a carbon atom). This overrides the default behaviour.
 * @property {Object[]} ringbonds An array containing the ringbond ids and bond types as specified in the original SMILE.
 * @property {Number} ringbonds[].id The ringbond id as defined in the SMILES.
 * @property {String} ringbonds[].bondType The bond type of the ringbond as defined in the SMILES.
 * @property {Number[]} rings The ids of rings which contain this atom.
 * @property {String} bondType The bond type associated with this array. Examples: -, =, #, ...
 * @property {Boolean} isBridge A boolean indicating whether or not this atom is part of a bridge in a bridged ring (contained by the largest ring).
 * @property {Boolean} isBridgeNode A boolean indicating whether or not this atom is a bridge node (a member of the largest ring in a bridged ring which is connected to a bridge-atom).
 * @property {Number[]} originalRings Used to back up rings when they are replaced by a bridged ring.
 * @property {Number} bridgedRing The id of the bridged ring if the atom is part of a bridged ring.
 * @property {Number[]} anchoredRings The ids of the rings that are anchored to this atom. The centers of anchored rings are translated when this atom is translated.
 * @property {Object} bracket If this atom is defined as a bracket atom in the original SMILES, this object contains all the bracket information. Example: { hcount: {Number}, charge: ['--', '-', '+', '++'], isotope: {Number} }.
 * @property {Number} chiral EXPERIMENTAL: Specifies chirality.
 * @property {Object[]} attachedPseudoElements A map with containing information for pseudo elements or concatinated elements. The key is comprised of the element symbol and the hydrogen count.
 * @property {String} attachedPseudoElement[].element The element symbol.
 * @property {Number} attachedPseudoElement[].count The number of occurences that match the key.
 * @property {Number} attachedPseudoElement[].hyrogenCount The number of hydrogens attached to each atom matching the key.
 * @property {Boolean} hasAttachedPseudoElements A boolean indicating whether or not this attom will be drawn with an attached pseudo element or concatinated elements.
 * @property {Boolean} isDrawn A boolean indicating whether or not this atom is drawn. In contrast to drawExplicit, the bond is drawn neither.
 * @property {Boolean} isConnectedToRing A boolean indicating whether or not this atom is directly connected (but not a member of) a ring.
 * @property {String[]} neighbouringElements An array containing the element symbols of neighbouring atoms.
 * @property {Boolean} isPartOfAromaticRing A boolean indicating whether or not this atom is part of an explicitly defined aromatic ring. Example: c1ccccc1.
 * @property {Number} bondCount The number of bonds in which this atom is participating.
 */
SmilesDrawer.Atom = class Atom {
    /**
     * The constructor of the class Atom.
     *
     * @param {String} element The one-letter code of the element.
     * @param {String} [bondType='-'] The type of the bond associated with this atom.
     */
    constructor(element, bondType = '-') {
        this.element = element.length === 1 ? element.toUpperCase() : element;
        this.drawExplicit = false;
        this.ringbonds = [];
        this.rings = [];
        this.bondType = bondType;
        this.isBridge = false;
        this.isBridgeNode = false;
        this.originalRings = [];
        this.bridgedRing = null;
        this.anchoredRings = [];
        this.bracket = null;
        this.chiral = 0;
        this.order = {};
        this.attachedPseudoElements = {};
        this.hasAttachedPseudoElements = false;
        this.isDrawn = true;
        this.isConnectedToRing = false;
        this.neighbouringElements = [];
        this.isPartOfAromaticRing = element !== this.element;
        this.bondCount = 0;
    }

    /**
     * Adds a neighbouring element to this atom.
     * 
     * @param {String} element A string representing an element.
     */
    addNeighbouringElement(element) {
        this.neighbouringElements.push(element);
    }

    /**
     * Attaches a pseudo element (e.g. Ac) to the atom.
     * @param {String} element The element identifier (e.g. Br, C, ...).
     * @param {String} previousElement The element that is part of the main chain (not the terminals that are converted to the pseudo element or concatinated).
     * @param {Number} [hydrogenCount=0] The number of hydrogens for the element.
     */
    attachPseudoElement(element, previousElement, hydrogenCount = 0) {
        let key = hydrogenCount + element;

        if (this.attachedPseudoElements[key]) {
            this.attachedPseudoElements[key].count += 1;
        } else {
            this.attachedPseudoElements[key] = { 
                element: element, 
                count: 1, 
                hydrogenCount: hydrogenCount, 
                previousElement: previousElement 
            };
        }

        this.hasAttachedPseudoElements = true;
    }

    /**
     * Returns the attached pseudo elements sorted by hydrogen count (ascending).
     *
     * @returns {Object} The sorted attached pseudo elements.
     */
    getAttachedPseudoElements() {
        let ordered = {};
        let that = this;

        Object.keys(this.attachedPseudoElements).sort().forEach(function(key) {
            ordered[key] = that.attachedPseudoElements[key];
        });

        return ordered;
    }

    /**
     * Returns the number of attached pseudo elements.
     *
     * @returns {Number} The number of attached pseudo elements.
     */
    getAttachedPseudoElementsCount() {
        return Object.keys(this.attachedPseudoElements).length;
    }

    /**
     * Defines this atom as the anchor for a ring. When doing repositionings of the vertices and the vertex associated with this atom is moved, the center of this ring is moved as well.
     *
     * @param {Number} ringId A ring id.
     */
    addAnchoredRing(ringId) {
        if (!SmilesDrawer.ArrayHelper.contains(this.anchoredRings, { value: ringId })) {
            this.anchoredRings.push(ringId);
        }
    }

    /**
     * Returns the number of ringbonds (breaks in rings to generate the MST of the smiles) within this atom is connected to.
     *
     * @returns {Number} The number of ringbonds this atom is connected to.
     */
    getRingbondCount() {
        return this.ringbonds.length;
    }

    /**
     * Check whether or not this atom is rotatable. The atom is deemed rotatable if it is neither a member of a ring nor participating in a bond other than a single bond. TODO: Check the chemistry.
     *
     * @returns {Boolean} A boolean indicating whether or not this atom is rotatable.
     */
    canRotate() {
        return this.bondType === '-' && this.rings.length == 0;
    }

    /**
     * Returns whether or not this atom participates in ringbonds (breaks in the ring in the MST).
     *
     * @returns {Boolean} A boolean indicating whether or not this atom is associated with a ringbond.
     */
    hasRingbonds() {
        return this.ringbonds.length > 0;
    }

    /**
     * Returns the id of the ringbond with the highest id.
     *
     * @returns {Number} The highest ringbond id associated with this atom.
     */
    getMaxRingbond() {
        let max = 0;
        for (let i = 0; i < this.ringbonds.length; i++) {
            if (this.ringbonds[i].id > max) {
                max = this.ringbonds[i].id
            }
        }
 
        return max;
    }

    /**
     * Checks whether or not this atom is part of a ring.
     * 
     * @returns {Boolean} A boolean indicating whether or not this atom is part of a ring.
     */
    isInRing() {
        return this.rings.length > 0;
    }

    /**
     * Checks whether or not this atom is a member of a given ring.
     *
     * @param {Number} ringId A ring id.
     * @returns {Boolean} A boolean indicating whether or not this atom is a member of a given ring.
     */
    hasRing(ringId) {
        for (let i = 0; i < this.rings; i++) {
            if (ringId === this.rings[i]) {
                return true;
            }
        }

        return false;
    }

    /**
     * Backs up the current rings.
     */
    backupRings() {
        this.originalRings = [];

        for (let i = 0; i < this.rings.length; i++) {
            this.originalRings.push(this.rings[i]);
        }
    }

    /**
     * Restores the most recent backed up rings.
     */
    restoreRings() {
        this.rings = [];
        
        for (let i = 0; i < this.originalRings.length; i++) {
            this.rings.push(this.originalRings[i]);
        }
    }

    /**
     * Checks whether or not two atoms share a common ringbond id. A ringbond is a break in a ring created when generating the spanning tree of a structure.
     *
     * @param {SmilesDrawer.Atom} atomA An atom.
     * @param {SmilesDrawer.Atom} atomB An atom.
     * @returns {Boolean} A boolean indicating whether or not two atoms share a common ringbond.
     */
    haveCommonRingbond(atomA, atomB) {
        for (let i = 0; i < atomA.ringbonds.length; i++) {
            for (let j = 0; j < atomB.ringbonds.length; j++) {
                if (atomA.ringbonds[i].id == atomB.ringbonds[j].id) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get the highest numbered ringbond shared by two atoms. A ringbond is a break in a ring created when generating the spanning tree of a structure.
     *
     * @param {SmilesDrawer.Atom} atomA An atom.
     * @param {SmilesDrawer.Atom} atomB An atom.
     * @returns {Number} The number of the maximum ringbond shared by two atoms.
     */
    maxCommonRingbond(atomA, atomB) {
        let commonMax = 0;
        let maxA = 0;
        let maxB = 0;

        for (let i = 0; i < atomA.ringbonds.length; i++) {
            if (atomA.ringbonds[i].id > maxA) {
                maxA = atomA.ringbonds[i].id;
            }

            for (let j = 0; j < atomB.ringbonds.length; j++) {
                if (atomB.ringbonds[j].id > maxB) {
                    maxB = atomB.ringbonds[j].id;
                } else if (maxA == maxB) {
                    commonMax = maxA;
                }
            }
        }

        return commonMax;
    }

    /**
     * Returns the order of this atom given a central atom.
     * 
     * @param {Number} center The id of the central atom in respect to which the order is defined.
     * @returns {Number} The order of this atom in respect to the center atom.
     */
    getOrder(center) {
        return this.order[center];
    }

    /**
     * Sets the order of this atom given a center. This is required since two atoms can have an order in respect to two different centers when connected by ringbonds.
     *
     * @param {Number} center The id of the central atom in respect to which the order is defined.
     * @param {Number} order The order of this atom.
     */
    setOrder(center, order) {
        this.order[center] = order;
    }

    /**
     * Check whether or not the neighbouring elements of this atom equal the supplied array.
     * 
     * @param {String[]} arr An array containing all the elements that are neighbouring this atom. E.g. ['C', 'O', 'O', 'N']
     * @returns {Boolean} A boolean indicating whether or not the neighbours match the supplied array of elements.
     */
    neighbouringElementsEqual(arr) {
        if (arr.length !== this.neighbouringElements.length) {
            return false;
        }

        arr.sort();
        this.neighbouringElements.sort();

        for (var i = 0; i < this.neighbouringElements.length; i++) {
            if(arr[i] !== this.neighbouringElements[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get the atomic number of this atom.
     * 
     * @returns {Number} The atomic number of this atom.
     */
    getAtomicNumber() {
        return Atom.atomicNumbers[this.element];
    }

    /**
     * Sorts an array of vertices by their respecitve atomic number.
     *
     * @param {SmilesDrawer.Vertex} root The central vertex
     * @param {Number[]} neighbours An array of vertex ids.
     * @param {SmilesDrawer.Vertex[]} vertices An array containing the vertices associated with the current molecule.
     * @param {SmilesDrawer.Ring[]} rings An array containing the rings associated with the current molecule.
     * @returns {Object[]} The array sorted by atomic number. Example of an array entry: { atomicNumber: 2, vertexId: 5 }.
     */
    static sortByAtomicNumber(neighbours, vertices) {
        let orderedVertices = new Array(neighbours.length);
        
        for (let i = 0; i < neighbours.length; i++) {
            let vertex = vertices[neighbours[i]];
            let val = Atom.atomicNumbers[vertex.value.element];

            orderedVertices[i] = {
                atomicNumber: val.toString(),
                vertexId: vertex.id
            };
        }

        return SmilesDrawer.ArrayHelper.sortByAtomicNumberDesc(orderedVertices);
    }

    /**
     * Checks wheter or not two atoms have the same atomic number
     *
     * @param {Object[]} sortedAtomicNumbers An array of vertex ids with their associated atomic numbers.
     * @param {Number} sortedAtomicNumbers[].vertexId A vertex id.
     * @param {Number} sortedAtomicNumbers[].atomicNumber The atomic number associated with the vertex id.
     * @returns {Boolean} A boolean indicating whether or not there are duplicate atomic numbers.
     */
    static hasDuplicateAtomicNumbers(sortedAtomicNumbers) {
        let found = {};
        
        for (let i = 0; i < sortedAtomicNumbers.length; i++) {
            let v = sortedAtomicNumbers[i];

            if (found[v.atomicNumber] !== undefined) {
                return true;
            }

            found[v.atomicNumber] = true;
        }

        return false;
    }

    /**
     * Returns sets of duplicate atomic numbers.
     *
     * @param {Object[]} sortedAtomicNumbers An array of vertex ids with their associated atomic numbers.
     * @param {Number} sortedAtomicNumbers[].vertexId A vertex id.
     * @param {Number} sortedAtomicNumbers[].atomicNumber The atomic number associated with the vertex id.
     * @returns {Array[]} An array of arrays containing the indices of duplicate atomic numbers.
     */
    static getDuplicateAtomicNumbers(sortedAtomicNumbers) {
        let duplicates = {};
        let dpl = [];

        for (let i = 0; i < sortedAtomicNumbers.length; i++) {
            let v = sortedAtomicNumbers[i];

            if (duplicates[v.atomicNumber] === undefined) {
                duplicates[v.atomicNumber] = [];
            }

            duplicates[v.atomicNumber].push(i);
        }

        for (let key in duplicates) {
            let arr = duplicates[key];

            if (arr.length > 1) {
                dpl.push(arr);
            }
        }

        return dpl;
    }
}

/**
 * A map mapping element symbols to their maximum bonds.
 */
SmilesDrawer.Atom.maxBonds = {
    'C': 4,
    'N': 3,
    'O': 2,
    'P': 3,
    'S': 2,
    'B': 3,
    'F': 1,
    'I': 1,
    'Cl': 1,
    'Br': 1
};

/**
 * A map mapping element symbols to the atomic number.
 */
SmilesDrawer.Atom.atomicNumbers = {
    'H': 1,
    'He': 2,
    'Li': 3,
    'Be': 4,
    'B': 5,
    'b': 5,
    'C': 6,
    'c': 6,
    'N': 7,
    'n': 7,
    'O': 8,
    'o': 8,
    'F': 9,
    'Ne': 10,
    'Na': 11,
    'Mg': 12,
    'Al': 13,
    'Si': 14,
    'P': 15,
    'p': 15,
    'S': 16,
    's': 16,
    'Cl': 17,
    'Ar': 18,
    'K': 19,
    'Ca': 20,
    'Sc': 21,
    'Ti': 22,
    'V': 23,
    'Cr': 24,
    'Mn': 25,
    'Fe': 26,
    'Co': 27,
    'Ni': 28,
    'Cu': 29,
    'Zn': 30,
    'Ga': 31,
    'Ge': 32,
    'As': 33,
    'Se': 34,
    'Br': 35,
    'Kr': 36,
    'Rb': 37,
    'Sr': 38,
    'Y': 39,
    'Zr': 40,
    'Nb': 41,
    'Mo': 42,
    'Tc': 43,
    'Ru': 44,
    'Rh': 45,
    'Pd': 46,
    'Ag': 47,
    'Cd': 48,
    'In': 49,
    'Sn': 50,
    'Sb': 51,
    'Te': 52,
    'I': 53,
    'Xe': 54,
    'Cs': 55,
    'Ba': 56,
    'La': 57,
    'Ce': 58,
    'Pr': 59,
    'Nd': 60,
    'Pm': 61,
    'Sm': 62,
    'Eu': 63,
    'Gd': 64,
    'Tb': 65,
    'Dy': 66,
    'Ho': 67,
    'Er': 68,
    'Tm': 69,
    'Yb': 70,
    'Lu': 71,
    'Hf': 72,
    'Ta': 73,
    'W': 74,
    'Re': 75,
    'Os': 76,
    'Ir': 77,
    'Pt': 78,
    'Au': 79,
    'Hg': 80,
    'Tl': 81,
    'Pb': 82,
    'Bi': 83,
    'Po': 84,
    'At': 85,
    'Rn': 86,
    'Fr': 87,
    'Ra': 88,
    'Ac': 89,
    'Th': 90,
    'Pa': 91,
    'U': 92,
    'Np': 93,
    'Pu': 94,
    'Am': 95,
    'Cm': 96,
    'Bk': 97,
    'Cf': 98,
    'Es': 99,
    'Fm': 100,
    'Md': 101,
    'No': 102,
    'Lr': 103,
    'Rf': 104,
    'Db': 105,
    'Sg': 106,
    'Bh': 107,
    'Hs': 108,
    'Mt': 109,
    'Ds': 110,
    'Rg': 111,
    'Cn': 112,
    'Uut': 113,
    'Uuq': 114,
    'Uup': 115,
    'Uuh': 116,
    'Uus': 117,
    'Uuo': 118
}

SmilesDrawer.Atom.mass = {
    'H': 1,
    'He': 2,
    'Li': 3,
    'Be': 4,
    'B': 5,
    'b': 5,
    'C': 6,
    'c': 6,
    'N': 7,
    'n': 7,
    'O': 8,
    'o': 8,
    'F': 9,
    'Ne': 10,
    'Na': 11,
    'Mg': 12,
    'Al': 13,
    'Si': 14,
    'P': 15,
    'p': 15,
    'S': 16,
    's': 16,
    'Cl': 17,
    'Ar': 18,
    'K': 19,
    'Ca': 20,
    'Sc': 21,
    'Ti': 22,
    'V': 23,
    'Cr': 24,
    'Mn': 25,
    'Fe': 26,
    'Co': 27,
    'Ni': 28,
    'Cu': 29,
    'Zn': 30,
    'Ga': 31,
    'Ge': 32,
    'As': 33,
    'Se': 34,
    'Br': 35,
    'Kr': 36,
    'Rb': 37,
    'Sr': 38,
    'Y': 39,
    'Zr': 40,
    'Nb': 41,
    'Mo': 42,
    'Tc': 43,
    'Ru': 44,
    'Rh': 45,
    'Pd': 46,
    'Ag': 47,
    'Cd': 48,
    'In': 49,
    'Sn': 50,
    'Sb': 51,
    'Te': 52,
    'I': 53,
    'Xe': 54,
    'Cs': 55,
    'Ba': 56,
    'La': 57,
    'Ce': 58,
    'Pr': 59,
    'Nd': 60,
    'Pm': 61,
    'Sm': 62,
    'Eu': 63,
    'Gd': 64,
    'Tb': 65,
    'Dy': 66,
    'Ho': 67,
    'Er': 68,
    'Tm': 69,
    'Yb': 70,
    'Lu': 71,
    'Hf': 72,
    'Ta': 73,
    'W': 74,
    'Re': 75,
    'Os': 76,
    'Ir': 77,
    'Pt': 78,
    'Au': 79,
    'Hg': 80,
    'Tl': 81,
    'Pb': 82,
    'Bi': 83,
    'Po': 84,
    'At': 85,
    'Rn': 86,
    'Fr': 87,
    'Ra': 88,
    'Ac': 89,
    'Th': 90,
    'Pa': 91,
    'U': 92,
    'Np': 93,
    'Pu': 94,
    'Am': 95,
    'Cm': 96,
    'Bk': 97,
    'Cf': 98,
    'Es': 99,
    'Fm': 100,
    'Md': 101,
    'No': 102,
    'Lr': 103,
    'Rf': 104,
    'Db': 105,
    'Sg': 106,
    'Bh': 107,
    'Hs': 108,
    'Mt': 109,
    'Ds': 110,
    'Rg': 111,
    'Cn': 112,
    'Uut': 113,
    'Uuq': 114,
    'Uup': 115,
    'Uuh': 116,
    'Uus': 117,
    'Uuo': 118
}