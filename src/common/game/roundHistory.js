import _ from 'lodash';
import ko from 'knockout';
import Round from 'common/game/round';
import Serializable from 'common/model/serializable';

class RoundHistory extends Serializable {
    constructor(definition) {
        definition = definition || {};
        super(definition);
        this.rounds = ko.observableArray(definition.rounds || []);
        this.currentRound = ko.observable(definition.currentRound);
    }

    startRound(id, number) {
        number = number || _.last(this.rounds()).number;
        this.currentRound(new Round({
            id: id,
            number: number
        }));
    }

    commitRound() {
        this.currentRound().commit();
        this.rounds.push(this.currentRound());
        this.currentRound(null);
    }

    getCurrentRound() {
        return this.currentRound();
    }

    lastRound() {
        return _.last(this.rounds());
    }
}

RoundHistory.registerClass();

export default RoundHistory;