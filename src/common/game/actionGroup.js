import Serializable from 'common/model/serializable';
import CurrentGame from 'common/game/currentGame';

class ActionGroup extends Serializable {
    constructor(definition) {
        definition = definition || {};
        super(definition);

        this.type = definition.type;
        this.id = definition.id;
        this.actionStartIndex = definition.actionStartIndex;
        this.actionEndIndex = definition.actionEndIndex;
    }

    commit() {
        this.actionEndIndex = CurrentGame().state().actionHistory.currentIndex();
    }

    undo() {
        CurrentGame().state().actionHistory.undoRange(this.actionStartIndex, this.actionEndIndex);
    }

    hasActions() {
        return this.actionEndIndex > this.actionStartIndex;
    }

    getActions() {
        if (this.actionEndIndex <= this.actionStartIndex) {
            return [];
        }
        return CurrentGame().state().actionHistory.getActionRange(this.actionStartIndex, this.actionEndIndex);
    }

    getSummaries() {
        if (this.actionEndIndex <= this.actionStartIndex) {
            return [];
        }

        return _(
            this.getActions())
            .invokeMap('summary', CurrentGame().state()).map(
                (summary, index) => {
                        return {
                            index: this.actionStartIndex + index,
                            type: 'action',
                            summary
                        }
                }).value();
    }

    getInstructions() {
        if (this.actionEndIndex <= this.actionStartIndex) {
            return [];
        }

        return _(
            this.getActions())
            .invokeMap('instructions', CurrentGame().state()).map(
                (instructions, index) => {
                    return _.map(instructions, (instruction) => {
                        return {
                            index: this.actionStartIndex + index,
                            type: 'action',
                            instruction
                        }
                    });
                }).flatten().value();
    }

    getDetails() {
        if (this.actionEndIndex <= this.actionStartIndex) {
            return [];
        }

        return _(
            this.getActions())
            .invokeMap('details', CurrentGame().state()).map(
                (details, index) => {
                        return {
                            index: this.actionStartIndex + index,
                            type: 'action',
                            details
                        }
                }).value();
    }

    isWithinRange(startIndex, endIndex) {
        return this.actionStartIndex >= startIndex && ((endIndex && this.actionEndIndex <= endIndex) || !endIndex );
    }
}

ActionGroup.registerClass();

export default ActionGroup;
