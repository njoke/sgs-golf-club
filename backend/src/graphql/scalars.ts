import { GraphQLError, GraphQLScalarType, Kind, type ValueNode } from "graphql";

function parseJsonLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return ast.values.map(parseJsonLiteral);
    case Kind.OBJECT:
      return Object.fromEntries(
        ast.fields.map((field) => [field.name.value, parseJsonLiteral(field.value)])
      );
    default:
      return null;
  }
}

export const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 DateTime scalar",
  serialize(value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      throw new GraphQLError("DateTime cannot represent invalid date value.");
    }
    return date.toISOString();
  },
  parseValue(value: unknown): Date {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      throw new GraphQLError("DateTime cannot represent invalid date value.");
    }
    return date;
  },
  parseLiteral(ast): Date {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError("DateTime must be provided as a string literal.");
    }
    const date = new Date(ast.value);
    if (Number.isNaN(date.getTime())) {
      throw new GraphQLError("DateTime cannot represent invalid date value.");
    }
    return date;
  },
});

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON scalar",
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    return parseJsonLiteral(ast);
  },
});
