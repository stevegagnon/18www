import _ from 'lodash';
import BaseState from 'common/game/baseState';
import RoundHistory from 'common/game/roundHistory';
import TurnHistory from 'common/game/turnHistory';
import ActionHistory from 'common/game/actionHistory';
import PhaseIds from '1846/config/phaseIds';
import PassCard from '1846/game/passCard';
import RoundIds from '1846/config/roundIds';
import ko from 'knockout';

class State extends BaseState {
    constructor(definition) {
        definition = definition || {};
        super(definition);

        this.id = definition.id;
        this.local = definition.local;

        this.players = ko.observableArray(definition.players || []);
        this.playersById = ko.computed(()=>{
            return _.keyBy(this.players(), 'id');
        });
        this.playersByOrder = ko.computed(()=> {
            return _.sortBy(this.players(), player=>player.order());
        });

        this.lastPlayerId = ko.observable(definition.currentPlayerId);


        this.currentPlayerIndex = ko.observable(definition.currentPlayerIndex || 0);
        this.currentPlayerId = ko.computed(()=> {
            return this.players()[this.currentPlayerIndex()].id;
        });
        this.currentPlayer = ko.computed(()=> {
            return this.players()[this.currentPlayerIndex()];
        });
        this.currentPhaseId = ko.observable(definition.currentPhase || PhaseIds.PHASE_I);
        this.currentRoundId = ko.observable(definition.currentRoundId);
        this.currentRoundNumber = ko.observable(definition.currentRoundNumber || 0);
        this.currentCompanyId = ko.observable(definition.currentCompanyId);


        this.firstPassIndex = ko.observable(definition.firstPassIndex);
        this.priorityDealIndex = ko.observable(definition.priorityDealIndex);
        this.certLimit = ko.observable(definition.certLimit || (this.players().length === 3 ? 14 : this.players().length === 4 ? 12 : 11))

        this.publicCompanies = definition.publicCompanies || [];
        this.publicCompaniesById = _.keyBy(this.publicCompanies, 'id');
        this.privateCompanies = definition.privateCompanies || [];
        this.privateCompaniesById = _.keyBy(this.privateCompanies, 'id');
        this.passCards = _.map(_.range(1,this.players().length + 1), (val) => {
           return new PassCard( {
               id: 'pass' + val,
               name: 'Pass ' + val
                                });
        });
        this.passCardsById = _.keyBy(this.passCards, 'id');
        this.undraftedPrivateIds = ko.observableArray(definition.undraftedPrivateIds || _(this.privateCompanies).map('id').concat(_.map(this.passCards, 'id')).shuffle().value());

        this.stockBoard = definition.stockBoard;
        this.bank = definition.bank;
        this.manifest = definition.manifest;

        this.roundHistory = definition.roundHistory || new RoundHistory();
        this.turnHistory = definition.turnHistory || new TurnHistory();
        this.actionHistory = definition.actionHistory || new ActionHistory();

        this.roundName = ko.computed(()=> {
            const currentRound = this.roundHistory.getCurrentRound();
            if (!currentRound) {
                return '';
            }

            return currentRound.getRoundName();
        });
    }

    trySerialize() {
        console.log(this.serialize());
    }
}

State.registerClass();

export default State;