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
export interface IEvent {
	type(): string;
	machineId(): string;
}

export interface ISubscriber {
	handle(event: IEvent): void;
}

export interface IPublishSubscribeService {
	publish(event: IEvent): void;
	subscribe(type: string, handler: ISubscriber): void;
	unsubscribe(type: string, handler: ISubscriber): void;
}

export class PublishSubscribeService implements IPublishSubscribeService {
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

export class MachineSaleEvent implements IEvent {
	constructor(private readonly _sold: number, private readonly _machineId: string) { }
	machineId(): string { return this._machineId; }
	getSoldQuantity(): number { return this._sold; }
	type(): string { return 'sale'; }
}

export class MachineRefillEvent implements IEvent {
	constructor(private readonly _refill: number, private readonly _machineId: string) { }
	machineId(): string { return this._machineId; }
	refillQuantity(): number { return this._refill; }
	type(): string { return 'refill'; }
}

export class LowStockWarningEvent implements IEvent {
	constructor(private readonly _machineId: string) { }
	type(): string { return 'lowStockWarning'; }
	machineId(): string { return this._machineId; }
}

export class StockLevelOkEvent implements IEvent {
	constructor(private readonly _machineId: string) { }
	type(): string { return 'stockLevelOk'; }
	machineId(): string { return this._machineId; }
}

export class MachineSaleSubscriber implements ISubscriber {
	constructor(public machines: Machine[], private pubSub: IPublishSubscribeService) { }
	handle(event: MachineSaleEvent): void {
		const machine = this.machines.find(m => m.id === event.machineId());
		if (machine) {
			machine.updateStock(-event.getSoldQuantity(), this.pubSub);
		}
	}
}

export class MachineRefillSubscriber implements ISubscriber {
	constructor(public machines: Machine[], private pubSub: IPublishSubscribeService) { }
	handle(event: MachineRefillEvent): void {
		const machine = this.machines.find(m => m.id === event.machineId());
		if (machine) {
			machine.updateStock(event.refillQuantity(), this.pubSub);
		}
	}
}

// objects
export class Machine {
	public stockLevel = 10;
	public id: string;
	private inLowStockState = false; // new

	constructor(id: string) {
		this.id = id;
	}

	updateStock(delta: number, pubSub: IPublishSubscribeService) {
		if (delta === 0) {
			Logger.warn(`${this.id}'s out of stock.`);
			return;
		}

		if (delta < 0 && Math.abs(delta) > this.stockLevel) {
			Logger.warn(`${this.id}'s attempting to sell more than available.`);
			this.stockLevel = 0;
		} else {
			this.stockLevel += delta;
			if (this.stockLevel < 0) {
				Logger.warn(`${this.id}'s stock went below 0.`);
				this.stockLevel = 0;
			}
		}

		if (!this.inLowStockState && this.stockLevel < LOW_STOCK_THRESHOLD) {
			this.inLowStockState = true;
			pubSub.publish(new LowStockWarningEvent(this.id));
		} else if (this.inLowStockState && this.stockLevel >= LOW_STOCK_THRESHOLD) {
			this.inLowStockState = false;
			pubSub.publish(new StockLevelOkEvent(this.id));
		}
	}
}
