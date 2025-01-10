// main.ts
import {
	Machine,
	IEvent,
	MachineSaleSubscriber,
	MachineRefillSubscriber,
	PublishSubscribeService,
	MachineSaleEvent,
	MachineRefillEvent
} from './app';

const randomMachine = (): string => {
	const random = Math.random() * 3;
	if (random < 1) {
		return '001';
	} else if (random < 2) {
		return '002';
	}
	return '003';
}

const eventGenerator = (): IEvent => {
	const random = Math.random();
	if (random < 0.5) {
		const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
		return new MachineSaleEvent(saleQty, randomMachine());
	}
	const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
	return new MachineRefillEvent(refillQty, randomMachine());
}

(async () => {
	// create 3 machines with a quantity of 10 stock
	const machines: Machine[] = [new Machine('001'), new Machine('002'), new Machine('003')];

	// create a machine sale event subscriber. inject the machines (all subscribers should do this)

	const pubSubService = new PublishSubscribeService();
	const saleSubscriber = new MachineSaleSubscriber(machines, pubSubService);
	const refillSubscriber = new MachineRefillSubscriber(machines, pubSubService);

	console.log(machines);
	pubSubService.subscribe('sale', saleSubscriber);
	pubSubService.subscribe('refill', refillSubscriber);

	// create 5 random events
	const events = [1, 2, 3, 4, 5].map(i => eventGenerator());

	// publish the events
	//events.map(pubSubService.publish);
	events.forEach(event => pubSubService.publish(event));
	console.log(machines);

	// test for warning event
	//const stubMachine = new Machine('00x');
	machines[0] = new Machine('00x');

	const stubEvent = new MachineSaleEvent(4, '00x');
	const stubEvent2 = new MachineRefillEvent(4, '00x');
	saleSubscriber.handle(stubEvent);
	saleSubscriber.handle(stubEvent);
	console.log(machines.find(m => m.id === '00x'));
	refillSubscriber.handle(stubEvent2);
	console.log(machines.find(m => m.id === '00x'));

	//pubSubService.unsubscribe('sale', saleSubscriber);
	//pubSubService.unsubscribe('refill', refillSubscriber);
	//events.forEach(event => pubSubService.publish(event));

	//console.log(machines);
})();
