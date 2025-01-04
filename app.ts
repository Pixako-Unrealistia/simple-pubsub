//const config = {
//	maxStock: 10, //TBD
//	lowStockWarning: 3,

//}

const LOW_STOCK_THRESHOLD = 3;

enum LogLevel {
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR'
}

class Logger {
	static log(level: LogLevel, message: string): void {
	console.log(`[${level}] ${message}`);
	}

	static info(message: string): void {
	this.log(LogLevel.INFO, message);
	}

	static warn(message: string): void {
	this.log(LogLevel.WARN, message);
	}

	static error(message: string): void {
	this.log(LogLevel.ERROR, message);
	}
}

// interfaces
interface IEvent {
	type(): string;
	machineId(): string;
}

interface ISubscriber {
	handle(event: IEvent): void;
}

interface IPublishSubscribeService {
	publish (event: IEvent): void;
	subscribe (type: string, handler: ISubscriber): void;
	unsubscribe (type: string, handler: ISubscriber): void;
}

class PublishSubscribeService implements IPublishSubscribeService {
	private readonly _subscribers: { [key: string]: ISubscriber[] };

	constructor() {
	this._subscribers = {};
	}

	publish(event: IEvent): void {
	Logger.info(`Publishing event: ${event.type()}, ${event.machineId()}`);
	const subscribers = this._subscribers[event.type()];
	if (subscribers) {
		subscribers.forEach(subscriber => {
		Logger.info('Notifying subscriber...');
		subscriber.handle(event);
		});
	}
	}

	subscribe(type: string, handler: ISubscriber): void {
		Logger.info(`Subscribing a handler for: ${type}`);
		const subscribers = this._subscribers[type];
		if (subscribers) {
			subscribers.push(handler);
		} else {
			this._subscribers[type] = [handler];
		}
	}
	
	unsubscribe(type: string, handler: ISubscriber): void {
		const subscribers = this._subscribers[type];
		if (subscribers) {
			this._subscribers[type] = subscribers.filter(subscriber => subscriber !== handler);
		}
	}
}  

class MachineSaleEvent implements IEvent {
	constructor(private readonly _sold: number, private readonly _machineId: string) {}

	machineId(): string {
		return this._machineId;
	}

	getSoldQuantity(): number {
		return this._sold
	}

	type(): string {
		return 'sale';
	}
}

class MachineRefillEvent implements IEvent {
	constructor(private readonly _refill: number, private readonly _machineId: string) {}

	machineId(): string {
		return this._machineId;
	}

	refillQuantity(): number {
		return this._refill;
	}

	type(): string {
		return 'refill';
	}
}

class LowStockWarningEvent implements IEvent {
	constructor(private readonly _machineId: string) {}
	type(): string { return 'lowStockWarning'; }
	machineId(): string { return this._machineId; }
}

class StockLevelOkEvent implements IEvent {
	constructor(private readonly _machineId: string) {}
	type(): string { return 'stockLevelOk'; }
	machineId(): string { return this._machineId; }
}

class MachineSaleSubscriber implements ISubscriber {
	constructor(
		public machines: Machine[],
		private pubSub: IPublishSubscribeService
	) {}

	handle(event: MachineSaleEvent): void {
		const machine = this.machines.find(m => m.id === event.machineId());
		if (machine) {
		machine.updateStock(-event.getSoldQuantity(), this.pubSub);
		}
	}
}
  
class MachineRefillSubscriber implements ISubscriber {
	constructor(
		public machines: Machine[],
		private pubSub: IPublishSubscribeService
	) {}

	handle(event: MachineRefillEvent): void {
		const machine = this.machines.find(m => m.id === event.machineId());
		if (machine) {
		machine.updateStock(event.refillQuantity(), this.pubSub);
		}
	}
}

// objects
class Machine {
	public stockLevel = 10;
	public id: string;
	private inLowStockState = false; // new

	constructor(id: string) {
	this.id = id;
	}

	updateStock(delta: number, pubSub: IPublishSubscribeService) {
		this.stockLevel += delta;
		if (!this.inLowStockState && this.stockLevel < LOW_STOCK_THRESHOLD) {
			this.inLowStockState = true;
			pubSub.publish(new LowStockWarningEvent(this.id));
		} else if (this.inLowStockState && this.stockLevel >= LOW_STOCK_THRESHOLD) {
			this.inLowStockState = false;
			pubSub.publish(new StockLevelOkEvent(this.id));
		}
	}
}


// helpers
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


// program
(async () => {
	// create 3 machines with a quantity of 10 stock
	const machines: Machine[] = [ new Machine('001'), new Machine('002'), new Machine('003') ];

	// create a machine sale event subscriber. inject the machines (all subscribers should do this)
	
	const pubSubService = new PublishSubscribeService();
	const saleSubscriber = new MachineSaleSubscriber(machines, pubSubService);
	const refillSubscriber = new MachineRefillSubscriber(machines, pubSubService);

	console.log(machines);
	pubSubService.subscribe('sale', saleSubscriber);
	pubSubService.subscribe('refill', refillSubscriber);

	// create 5 random events
	const events = [1,2,3,4,5].map(i => eventGenerator());

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
