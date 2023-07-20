import { Task, TaskCommand, TaskTransaction } from './task-types';
import { TaskEditState, TaskEditMutatorBuilder, TaskEditEvent, SingleEvent } from './task-edit-ctx-types';




interface ExtendedInit extends TaskEditState {
  userId: string;
}

class TaskEditStateBuilder implements TaskEditMutatorBuilder {
  private _task: Task;
  private _events: TaskEditEvent[];
  private _userId: string;


  constructor(init: ExtendedInit) {
    this._task = init.task;
    this._userId = init.userId;
    this._events = new TaskEditEventVisitor({task: init.task, userId: init.userId}).build();
  }
  get task(): Task { return this._task };
  get userId(): string { return this._userId };
  get events(): TaskEditEvent[] {return this._events }


  withTask(input: Task): TaskEditStateBuilder {
   return new TaskEditStateBuilder({...this.clone(), task: input});
  }
  withCommands(input: TaskCommand | TaskCommand[]): TaskEditStateBuilder {
   return new TaskEditStateBuilder({...this.clone()});
  }
  clone(): ExtendedInit {
    const init = this;
    return {
      userId: init.userId,
      task: init.task,
      events: init.events 
    }
  }
}


class TaskEditEventVisitor {
  private _groups: Record<string, SingleEvent[]>;
  
  constructor(init: {
    task: Task;
    userId: string;
  }) {
    this._groups = {};
    this.visit(init.task);
  }

  public build(): TaskEditEvent[] {
    return Object.values(this._groups).map(events => {
      if(events.length === 1) {
        return events[0];
      } 
      return { type: "COLLAPSED", items: events };
    });
  }

  private visit(task: Task) {
    task.transactions.forEach(tx => this.visitTransaction(tx, task));    
  }
  
  private visitTransaction(tx: TaskTransaction, task: Task) {
    tx.commands.forEach(command => this.visitCommand(command, tx, task));
  }
  
  private visitCommand(command: TaskCommand, tx: TaskTransaction, task: Task) {
    let groupId: string = Object.entries(this._groups).length + "";
    if(!this._groups[groupId]) {
      this._groups[groupId] = [];
    }
    
    this._groups[groupId].push(this.visitEvent(command, tx, task));
  }
  
  private visitEvent(command: TaskCommand, tx: TaskTransaction, task: Task): SingleEvent {
    return { 
      type: 'SINGLE',
      body: {
        commandType: command.commandType,
        toCommand: command as any,
        fromCommand: undefined
        
      }
      
    }
  }
}



export { TaskEditStateBuilder };
export type { };