import { expect } from 'chai';
import * as sinon from 'sinon';

import { Machine, MachineSaleEvent, MachineRefillEvent, PublishSubscribeService, MachineSaleSubscriber, MachineRefillSubscriber } from '../app';

describe('Machine Tests', () => {
	let machine: Machine;
	let pubSub: PublishSubscribeService;

	beforeEach(() => {
		machine = new Machine('machine-1');
		pubSub = new PublishSubscribeService();
	});

	it('should decrement stock when a sale event occurs', () => {
		const saleEvent = new MachineSaleEvent(2, 'machine-1');
		const saleSubscriber = new MachineSaleSubscriber([machine], pubSub);
		pubSub.subscribe('sale', saleSubscriber);

		pubSub.publish(saleEvent);
		expect(machine.stockLevel).to.equal(8);
	});

	it('should increment stock when a refill event occurs', () => {
		const refillEvent = new MachineRefillEvent(5, 'machine-1');
		const refillSubscriber = new MachineRefillSubscriber([machine], pubSub);
		pubSub.subscribe('refill', refillSubscriber);

		pubSub.publish(refillEvent);
		expect(machine.stockLevel).to.equal(15);
	});

	it('should publish low stock event when stock < threshold', () => {
		const events: string[] = [];
		pubSub.subscribe('lowStockWarning', { handle: (e) => events.push(e.type()) });

		machine.updateStock(-8, pubSub);
		expect(events).to.include('lowStockWarning');
	});

	it('should publish stock level ok event when stock recovers >= threshold', () => {
		machine.stockLevel = 2;
		(machine as any).inLowStockState = true;
		const events: string[] = [];
		pubSub.subscribe('stockLevelOk', { handle: (e) => events.push(e.type()) });

		machine.updateStock(2, pubSub);
		expect(events).to.include('stockLevelOk');
	});
});

describe('PublishSubscribeService Tests', () => {
	it('should notify subscribers of a published event', () => {
		const pubSub = new PublishSubscribeService();
		const mockHandler = { handle: () => {} };
		const handleSpy = sinon.spy(mockHandler, 'handle');
		pubSub.subscribe('sale', mockHandler);
		const event = new MachineSaleEvent(3, 'machine-2');

		pubSub.publish(event);
		//expect(handleSpy.calledWith(event)).to.be.true;
		expect(handleSpy.called).to.be.true;
	});

	it('should allow unsubscribing handlers', () => {
		const pubSub = new PublishSubscribeService();
		const mockHandler = { handle: () => {} };
		const handleSpy = sinon.spy(mockHandler, 'handle');
		pubSub.subscribe('sale', mockHandler);
		pubSub.unsubscribe('sale', mockHandler);

		pubSub.publish(new MachineSaleEvent(1, 'machine-3'));
		expect(handleSpy.called).to.be.false;
	});
});

