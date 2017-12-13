import _ from 'lodash';
import ko from 'knockout';
import Turn from 'common/game/turn';
import Serializable from 'common/model/serializable';
import CurrentGame from 'common/game/currentGame';

class TurnHistory extends Serializable {
    constructor(definition) {
        definition = definition || {};
        super(definition);
        this.turns = ko.observableArray(definition.turns || []);
        this.currentTurn = ko.observable(definition.currentTurn);
    }

    toJSON() {
        const plainObject = super.toJSON();
        plainObject.turns = this.turns();
        plainObject.currentTurn = this.currentTurn();
        return plainObject;
    }

    startTurn(turnContext) {
        this.currentTurn(new Turn({
            number: this.nextTurnNumber(),
            context: turnContext
        }));
    }

    rollbackTurn() {
        if (this.currentTurn()) {
            this.currentTurn().undo();
        }
    }

    rollbackCurrentAction() {
        this.currentTurn().rollbackActionGroup();
    }

    commitTurn() {
        this.currentTurn().commit();
        this.turns.push(this.currentTurn());
        this.currentTurn(null);
    }

    undoLastTurn() {
        const turn = this.turns.pop();
        turn.undo();
    }

    getCurrentTurn() {
        return this.currentTurn();
    }

    lastTurn() {
        return _.last(this.turns());
    }

    nextTurnNumber() {
        return this.turns().length + 1;
    }

}

TurnHistory.registerClass();

export default TurnHistory;