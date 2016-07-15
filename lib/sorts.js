/**
 * Sort a section based on priority, category, or heading
 *
 * @param {object} section
 * @returns {object} sorted section
 */
module.exports = function sort(section){
    return section.sort(function(a,b){

        if (a.priority !== b.priority){
            return a.priority - b.priority;
        }

        //Items with the same category should be distinguished by their heading
        if (a.category === b.category) {

            if (a.heading > b.heading) {
                return 1;
            }
            if (a.heading < b.heading) {
                return -1;
            }
            return 0;
        }
        else {

            if (a.category > b.category) {
                return 1;
            }
            if (a.category < b.category) {
                return -1;
            }
            return 0;
        }
    });
}
