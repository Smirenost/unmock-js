// Sinon for asserts and matchers
import * as sinon from "sinon";
import Backend, { buildRequestHandler } from "./backend";
import UnmockFaker from "./faker";
import { ILogger, IUnmockOptions, IUnmockPackage } from "./interfaces";
import { addFromNock, NockAPI, ServiceStore } from "./service/serviceStore";
import { AllowedHosts, BooleanSetting, IBooleanSetting } from "./settings";
import * as typeUtils from "./utils";

export * from "./interfaces";
export * from "./types";
export { sinon };
export { u } from "./nock";
export { transform, Addl, Arr } from "./generator-utils";
export { IInterceptorFactory, IInterceptorOptions } from "./interceptor";
export { IService } from "./service/interfaces";
export { Service } from "./service";
export { ServiceCore } from "./service/serviceCore";
export { Backend, buildRequestHandler };
export { typeUtils };
export { UnmockFaker };

export class UnmockPackage implements IUnmockPackage {
  public allowedHosts: AllowedHosts;
  /**
   * Always return a new randomized response instead of using a fixed seed.
   */
  public randomize: IBooleanSetting;
  public readonly backend: Backend;
  /**
   * Add a new service using declarative syntax.
   */
  public readonly mock: NockAPI;
  public readonly nock: NockAPI;

  private readonly opts: IUnmockOptions;
  private logger: ILogger = { log: () => undefined }; // Default logger does nothing
  constructor(
    backend: Backend,
    options?: {
      logger?: ILogger;
    },
  ) {
    this.backend = backend;
    this.logger = (options && options.logger) || this.logger;

    this.allowedHosts = new AllowedHosts();

    this.randomize = new BooleanSetting(false);
    this.opts = {
      isWhitelisted: (url: string) => this.allowedHosts.isWhitelisted(url),
      log: (message: string) => this.logger.log(message),
      randomize: () => this.randomize.get(),
    };
    this.mock = addFromNock(this.backend.serviceStore);
    this.nock = addFromNock(this.backend.serviceStore);
  }

  /**
   * Create a new `UnmockFaker` with empty `ServiceStore`.
   *
   * @example
   *
   * const faker = unmock.faker();
   * faker
   *  .mock('https://api.github.com', 'github')
   *  .get('/v1/users')
   *  .reply({ id: '1' });
   * const req: ISerializedRequest = {
   *  host: "api.github.com",
   *  path: '/v1/users',
   *  protocol: 'https',
   *  ...
   * };
   * const res = faker.generate(request);
   *
   * @returns UnmockFaker instance
   */
  public faker(): UnmockFaker {
    return new UnmockFaker({ serviceStore: new ServiceStore([]) });
  }

  public on() {
    this.backend.initialize(this.opts);
    return this;
  }
  public init() {
    return this.on();
  }
  public initialize() {
    return this.on();
  }

  public off() {
    this.backend.reset();
  }

  public get services() {
    return this.backend.services;
  }

  public associate(url: string, name: string) {
    this.backend.serviceStore.updateOrAdd({ baseUrl: url, name });
  }

  public reloadServices() {
    this.backend.loadServices();
  }

  public reset() {
    this.backend.serviceStore.resetServices();
  }
}
