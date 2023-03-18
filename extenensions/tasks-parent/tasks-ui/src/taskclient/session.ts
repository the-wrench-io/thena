import { DocumentId, Document, DocumentUpdate, Session, PageUpdate, TabBody, TabEntity } from './composer-types';
import { HeadState, Task } from './client-types';

class SiteCache {
  private _site: HeadState;
  private _tasks: Task[];
  constructor(site: HeadState, tasks: Task[]) {
    this._site = site;
    this._tasks = tasks;
  }

  getEntity(entityId: DocumentId): Document {
    /*
    if(entityId.startsWith("debug-fill/")) {
      entityId = entityId.substring(11);
    }
    let entity: Client.Entity = this._site.forms[entityId];
    if (!entity) {
      entity = this._site.revs[entityId];
    }
    if (!entity) {
      entity = this._site.releases[entityId];
    }
    */
    
    let delegate = this._tasks.find(p => p.id === entityId)
    if (delegate != null) {
      return {
        id: entityId,
        delegate,
        kind: 'TASK'
      };
    }

    return {
      id: entityId,
      delegate: this._site,
      kind: 'HEAD'
    };
  }
}

class SessionData implements Session {
  private _head: HeadState;
  private _pages: Record<DocumentId, PageUpdate>;
  private _cache: SiteCache;
  private _tasks: Task[];

  constructor(props: {
    head?: HeadState;
    pages?: Record<DocumentId, PageUpdate>;
    cache?: SiteCache;
    tasks: Task[];
  }) {
    this._head = props.head ? props.head : { name: "", contentType: "OK"};
    this._pages = props.pages ? props.pages : {};
    this._cache = props.cache ? props.cache : new SiteCache(this._head, props.tasks);
    this._tasks = props.tasks;
  }
  get head() {
    return this._head;
  }
  get pages() {
    return this._pages;
  }
  getEntity(entityId: DocumentId): Document | undefined {
    return this._cache.getEntity(entityId);
  }
  withHead(head: HeadState) {
    if (!head) {
      console.error("Head not defined error", head);
      return this;
    }
    return new SessionData({ head, pages: this._pages, tasks: this._tasks });
  }
  withoutPages(pageIds: DocumentId[]): SessionData {
    const pages: Record<DocumentId, PageUpdate> = {};
    for (const page of Object.values(this._pages)) {
      if (pageIds.includes(page.origin.id)) {
        continue;
      }
      pages[page.origin.id] = page;
    }
    return new SessionData({ head: this._head, pages, cache: this._cache, tasks: this._tasks });
  }
  withPage(page: DocumentId): SessionData {
    if (this._pages[page]) {
      return this;
    }
    const pages = Object.assign({}, this._pages);
    const origin = this._cache.getEntity(page);


    if (!origin) {
      throw new Error("Can't find entity with id: '" + page + "'")
    }

    pages[page] = new ImmutablePageUpdate({ origin, saved: true, value: [] });
    return new SessionData({ head: this._head, pages, cache: this._cache, tasks: this._tasks });
  }
  withPageValue(page: DocumentId, value: DocumentUpdate[]): SessionData {
    const session = this.withPage(page);
    const pageUpdate = session.pages[page];

    const pages = Object.assign({}, session.pages);
    pages[page] = pageUpdate.withValue(value);

    return new SessionData({ head: session.head, pages, cache: this._cache, tasks: this._tasks });
  }
}

class ImmutablePageUpdate implements PageUpdate {
  private _saved: boolean;
  private _origin: Document;
  private _value: DocumentUpdate[];

  constructor(props: {
    saved: boolean;
    origin: Document;
    value: DocumentUpdate[];
  }) {
    this._saved = props.saved;
    this._origin = props.origin;
    this._value = props.value;
  }

  get saved() {
    return this._saved;
  }
  get origin() {
    return this._origin;
  }
  get value() {
    return this._value;
  }
  withValue(value: DocumentUpdate[]): PageUpdate {
    return new ImmutablePageUpdate({ saved: false, origin: this._origin, value });
  }
}

class ImmutableTabData implements TabBody {
  private _nav: TabEntity;

  constructor(props: { nav: TabEntity }) {
    this._nav = props.nav;
  }
  get nav() {
    return this._nav;
  }
  withNav(nav: TabEntity) {
    return new ImmutableTabData({
      nav: {
        value: nav.value === undefined ? this._nav.value : nav.value
      }
    });
  }
}



const initSession = new SessionData({ tasks: []});
export { SessionData, ImmutableTabData, initSession };