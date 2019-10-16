import { Backend, IServiceDef } from "unmock-core";
import {
  IInterceptorFactory,
  IInterceptorOptions,
} from "unmock-core/src/interceptor";
import createFsServiceDefLoader from "./fs-service-def-loader";
import NodeInterceptor from "./interceptor/node-interceptor";
import FSLogger from "./loggers/filesystem-logger";
import FSSnapshotter from "./loggers/snapshotter";

export interface INodeBackendOptions {
  servicesDirectory?: string;
  interceptorFactory?: IInterceptorFactory;
}

/**
 * Node.js backend. Uses Node.js interceptor and loads services from the
 * filesystem at construction.
 */
export default class NodeBackend extends Backend {
  private readonly servicesDirectory?: string;
  public constructor(config?: INodeBackendOptions) {
    const servicesDirectory = config && config.servicesDirectory;
    const listeners = [
      new FSLogger({
        directory: servicesDirectory,
      }),
      FSSnapshotter.getOrUpdateSnapshotter({}),
    ];
    const interceptorFactory =
      (config && config.interceptorFactory) ||
      ((options: IInterceptorOptions) => new NodeInterceptor(options));
    super({
      interceptorFactory,
      listeners,
    });
    this.servicesDirectory = config && config.servicesDirectory;
    this.loadServices();
  }

  public loadServices() {
    const serviceDefLoader = createFsServiceDefLoader(this.servicesDirectory);
    const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
    this.updateServiceDefs(serviceDefs);
  }
}