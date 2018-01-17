import Cell from 'common/map/cell';
import _ from 'lodash';

class OffBoardCell extends Cell {
    constructor(definition) {
        definition = definition || {};
        super(definition);
        this.offboard = true;
        this.connections = definition.connections;
        this.direction = definition.direction;
        this.ewBonus = definition.bonus;
    }

    getConnectionPointAtIndex(neighbor, index) {
        return this.hasConnectionAtIndex(neighbor.id + '|' + index) ? index : -1;
    }

    hasConnectionAtIndex(index) {
        return _.indexOf(this.connections, index) >= 0;
    }
}

export default OffBoardCell;