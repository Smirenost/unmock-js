import { OpenAPIObject } from "loas3/dist/src/generated/full";
import { stateStoreFactory } from "../service";
import { Service } from "../service/service";

const schemaBase: OpenAPIObject = {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Swagger Petstore",
    license: { name: "MIT" },
  },
  paths: {},
};

describe("Fluent API and Service instantiation tests", () => {
  // define some service populators that match IOASMappingGenerator type
  const PetStoreWithEmptyPaths = [
    new Service({ schema: schemaBase, name: "petstore" }),
  ];
  const PetStoreWithEmptyResponses = [
    new Service({
      name: "petstore",
      schema: { ...schemaBase, paths: { "/pets": { get: { responses: {} } } } },
    }),
  ];
  const PetStoreWithPseudoResponses = [
    new Service({
      name: "petstore",
      schema: {
        ...schemaBase,
        paths: {
          "/pets": {
            get: { responses: { 200: { description: "Mock response" } } },
          },
        },
      },
    }),
  ];

  test("Store with empty paths", () => {
    const store = stateStoreFactory(PetStoreWithEmptyPaths);
    expect(store.noservice).toThrow("Can't find specification");
    expect(store.petstore).toThrow("has no defined paths");
    expect(store.petstore.get).toThrow("has no defined paths");
  });

  test("Store with non-empty paths with non-matching method", () => {
    const store = stateStoreFactory(PetStoreWithEmptyResponses);
    expect(store.petstore.post).toThrow("Can't find any endpoints with method");
  });

  test("Store with basic call", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore(); // Should pass
  });

  test("Store with REST method call", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore.get(); // Should pass
  });

  test("Chaining multiple states without REST methods", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store
      .petstore()
      .petstore()
      .petstore();
  });

  test("Chaining multiple states with REST methods", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore
      .get()
      .petstore.get()
      .petstore();
  });

  test("Chaining multiple methods for a service", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore
      .get()
      .get()
      .petstore();
    expect(store.get).toThrow("Can't find specification");
    expect(store.petstore.get().boom).toThrow("Can't find specification");
  });

  test("Specifying endpoint without rest method", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore("/pets"); // should pass
    expect(() => store.petstore("/pet")).toThrow("Can't find endpoint");
  });

  test("Specifying endpoint with rest method", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore.get("/pets"); // should pass
    expect(() => store.petstore.post("/pets")).toThrow("Can't find response");
    expect(() => store.petstore.get("/pet")).toThrow("Can't find endpoint");
  });
});

describe("Test paths matching on serviceStore", () => {
  // tslint:disable: object-literal-sort-keys
  const petStoreParameters = {
    parameters: [
      {
        name: "petId",
        in: "path",
        required: true,
        description: "The id of the pet to retrieve",
        schema: { type: "string" },
      },
      {
        name: "test",
        in: "path",
      },
    ],
  };
  const DynamicPathsService = (
    params: any,
    ...additionalPathElement: string[]
  ) => {
    const path = `/pets/{petId}${additionalPathElement.join("/")}`;
    return [
      new Service({
        schema: {
          ...schemaBase,
          paths: {
            [path]: {
              get: {
                summary: "Info for a specific pet",
                operationId: "showPetById",
                tags: ["pets"],
                ...params,
                responses: {
                  200: {},
                },
              },
            },
          },
        },
        name: "petstore",
      }),
    ];
  };

  test("Paths are converted to regexp", () => {
    const store = stateStoreFactory(DynamicPathsService(petStoreParameters));
    store.petstore("/pets/2"); // Should pass
    expect(() => store.petstore("/pet/2")).toThrow("Can't find endpoint");
    expect(() => store.petstore("/pets/")).toThrow("Can't find endpoint");
  });

  test("Creation fails with missing parameters", () => {
    expect(() => stateStoreFactory(DynamicPathsService({}))).toThrow(
      "no description for path parameters!",
    );
    expect(() =>
      stateStoreFactory(DynamicPathsService({ parameters: {} })),
    ).toThrow("no description for path parameters!");
  });

  test("Creation fails with partial missing parameters", () => {
    expect(() =>
      stateStoreFactory(
        DynamicPathsService(petStoreParameters, "/{boom}", "{foo}"),
      ),
    ).toThrow("following path parameters have not been described");
  });
});