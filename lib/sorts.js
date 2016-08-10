
function compare(a, b) {
    switch (true) {
        case a > b: return 1;
        case a < b: return -1;
        default: return 0;
    }
}

/**
 * Sort a section based on priority, category, or heading
 *
 * @param {object} section
 * @returns {object} sorted section
 */
module.exports = function sort(section){
    return section.sort(function(a,b) {

        //Items with the same category should be distinguished by their heading
        if (a.category === b.category) {

            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }

            return compare(a.heading, b.heading);
        }
        else {
            return compare(a.category, b.category);
        }
    });
};
