import Action from 'common/game/action';
import CompanyTypes from 'common/model/companyTypes';
import CompanyIDs from '1846/config/companyIds';
import TrainNames from '1846/config/trainNames';
import Allocations from '1846/config/allocations';
import Prices from '1846/config/prices';
import _ from 'lodash';

class RunRoutes extends Action {

    constructor(args) {
        super(args);

        this.playerId = args.playerId;
        this.companyId = args.companyId;
        this.trains = args.trains;
        this.revenue = args.revenue;
        this.allocation = args.allocation;
        this.oldLastRun = args.oldLastRun;
        this.oldPriceIndex = args.oldPriceIndex;
        this.newPriceIndex = args.newPriceIndex;
        this.oldCompaniesForPriceIndex = args.oldCompaniesForPriceIndex;
        this.oldTrains = args.oldTrains;
        this.closeData = args.closeData;
        this.oldOperated = args.oldOperated;
        this.playerPayouts = args.playerPayouts || {};
        this.companyPayout = args.companyPayout || 0;
    }

    doExecute(state) {
        const company = state.getCompany(this.companyId);
        const player = state.playersById()[this.playerId];
        this.oldTrains = _.map(company.trains(), train => train.clone());
        this.oldPriceIndex = company.priceIndex();
        this.oldCompaniesForPriceIndex = state.stockBoard.getCompaniesForPriceIndex(this.oldPriceIndex);
        this.oldLastRun = company.lastRun();
        this.oldOperated = company.operated();
        this.revenue = this.calculateRevenue(state);
        const companyIncome = this.calculateCompanyIncome(company, this.revenue, this.allocation);
        const payout = this.calculatePayout(this.revenue, this.allocation);

        // Update and pay company
        company.lastRun(this.revenue);

        if (companyIncome > 0) {
            state.bank.removeCash(companyIncome);
            company.addCash(companyIncome);
            this.companyPayout = companyIncome;
        }

        // Pay players
        if (company.type === CompanyTypes.INDEPENDANT) {
            if(this.revenue > 0) {
                const halfPayout = this.revenue / 2;
                state.bank.removeCash(halfPayout);
                player.addCash(halfPayout);
                this.playerPayouts[player.id] = halfPayout;
            }
        }
        else {
            if (this.allocation === Allocations.NONE || this.revenue === 0) {
                company.priceIndex(Prices.leftIndex(this.oldPriceIndex,
                                                    (!company.president() && company.numTrainsForLimit() === 0) ? 2 : 1));
            }
            else {
                company.priceIndex(
                    Prices.rightIndex(this.oldPriceIndex, this.calculateStockMovement(payout, company.price())))
            }

            const payoutPerShare = payout / 10;
            _.each(state.players(), player => {
                const cash = player.numSharesOwnedOfCompany(this.companyId) * payoutPerShare;
                if (cash > 0) {
                    state.bank.removeCash(cash);
                    player.addCash(cash);
                    this.playerPayouts[player.id] = cash;
                }
            });
        }

        company.updateTrains(_.map(this.trains, train => train.clone()));
        _.each(company.trains(), train => {
            if (train.phasedOut()) {
                train.phasedOut(false);
                train.rusted(true);
            }
        });

        if (company.type === CompanyTypes.PUBLIC && company.priceIndex() === 0) {
            this.closeData = company.close();
        }
        company.operated(true);
        this.newPriceIndex = company.priceIndex();
    }

    doUndo(state) {
        const company = state.getCompany(this.companyId);
        const player = state.playersById()[this.playerId];
        const companyIncome = this.calculateCompanyIncome(company, this.revenue, this.allocation);
        const payout = this.calculatePayout(this.revenue, this.allocation);

        if (this.closeData) {
            company.unclose(this.closeData);
        }

        // Unpay players
        if (company.type === CompanyTypes.INDEPENDANT) {
            state.bank.addCash(this.revenue / 2);
            player.removeCash(this.revenue / 2);
        }
        else {
            company.priceIndex(this.oldPriceIndex);
            const payoutPerShare = payout / 10;
            _.each(state.players(), player => {
                const cash = player.numSharesOwnedOfCompany(this.companyId) * payoutPerShare;
                state.bank.addCash(cash);
                player.removeCash(cash);
            });
            state.stockBoard.setCompaniesForPriceIndex(this.oldPriceIndex, this.oldCompaniesForPriceIndex);
        }

        // Update and unpay company
        state.bank.addCash(companyIncome);
        company.removeCash(companyIncome);
        company.trains(_.map(this.oldTrains, train => train.clone()));
        company.lastRun(this.oldLastRun);
        company.operated(this.oldOperated);
    }

    summary(state) {
        const company = state.getCompany(this.companyId);
        const payout = this.calculatePayout(this.revenue, this.allocation);
        const movement = (this.revenue === 0 || this.allocation === Allocations.NONE) ? -1 : this.calculateStockMovement(
            payout, Prices.price(this.oldPriceIndex));
        const newPrice = Prices.price(this.newPriceIndex);
        const allocationText = this.revenue > 0 ? ' and ' + this.getAllocationText(this.allocation, true) : '';
        const trainText = this.trains.length === 0 ? 'no trains' : 'its ' + _(this.trains).map(
                train => TrainNames[train.type]).join(
                ',') + ' train' + (this.trains.length > 1 ? 's' : '') + ' for $' + this.revenue + allocationText;
        const stockText = company.type === CompanyTypes.INDEPENDANT ? '' : ' - share price ' + this.getMovementText(
                movement) + ' $' + newPrice;
        return company.nickname + ' ran ' + trainText + stockText;
    }

    confirmation(state) {
        const revenue = this.calculateRevenue(state);
        const allocationText = this.revenue > 0 ? ' and ' + this.getAllocationText(this.allocation) : '';
        return 'Confirm run trains for $' + revenue + allocationText;
    }

    details(state) {
        const company = state.getCompany(this.companyId);
        const details = [];
        if (this.companyPayout) {
            details.push(company.nickname + ' receives $' + this.companyPayout);
        }
        _.each(this.playerPayouts, (amount, id) => {
            const player = state.playersById()[id];
            details.push(player.name() + ' receives $' + amount);
        });
        return details;
    }

    calculateRevenue(state) {
        const company = state.getCompany(this.companyId);
        let revenue = _.sumBy(this.trains, train => train.route.revenue());
        if (company.hasPrivate(CompanyIDs.MAIL_CONTRACT)) {
            revenue += (_(this.trains).map(train => train.route.numStops()).max() || 0) * 10;
        }
        return revenue;
    }

    calculateCompanyIncome(company, revenue, allocation) {
        let companyIncome = 0;
        if (company.type === CompanyTypes.INDEPENDANT) {
            companyIncome = revenue / 2;
        }
        else if (allocation === Allocations.NONE) {
            companyIncome = revenue;
        }
        else if (allocation === Allocations.HALF) {
            const halfRevenue = revenue / 2;
            const remainder = halfRevenue % 10;
            const withheld = halfRevenue - remainder;
            const payout = halfRevenue + remainder;
            const payoutPerShare = payout / 10;
            companyIncome = withheld + (payoutPerShare * company.shares());
        }
        else {
            companyIncome = (revenue / 10) * company.shares();
        }
        return companyIncome;
    }

    calculatePayout(revenue, allocation) {
        let payout = 0;
        if (allocation !== Allocations.NONE) {
            if (allocation === Allocations.HALF) {
                const halfRevenue = revenue / 2;
                const remainder = halfRevenue % 10;
                payout = halfRevenue + remainder;
            }
            else {
                payout = revenue;
            }
        }
        return payout;
    }

    calculateStockMovement(revenue, currentPrice) {
        if (revenue < currentPrice) {
            return 0;
        }
        else if (revenue < currentPrice * 2) {
            return 1;
        }
        else if (revenue < currentPrice * 3 || currentPrice < 165) {
            return 2;
        }
        else {
            return 3;
        }
    }

    getAllocationText(allocation, past) {
        if (allocation === Allocations.NONE) {
            return past ? 'withheld' : 'withhold';
        }
        else if (allocation === Allocations.HALF) {
            return past ? 'paid half' : 'pay half';
        }
        else if (allocation === Allocations.FULL) {
            return past ? 'paid full' : 'pay full';
        }
    }

    getMovementText(movement) {
        if (movement < 0) {
            return 'moved back to';
        }
        else if (movement === 0) {
            return 'stayed at';
        }
        else if (movement === 1) {
            return 'moved to'
        }
        else if (movement === 2) {
            return 'double jumped to'
        }
        else if (movement === 3) {
            return 'triple jumped to'
        }
    }

}

RunRoutes.registerClass();

export default RunRoutes