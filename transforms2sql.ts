import {
  Transform,
  isFilter,
  isAggregate
} from "vega-lite/build/src/transform";

export class Transforms2SQL {
  // we can only support a small subset of aggregate operations with our current approach
  public static agg_op_mappings = {
    mean: "avg",
    average: "avg"
  };
  public static convert(
    table: string,
    selections: string[],
    transforms: Transform[]
  ): string {
    let components = {
      select: new Set(Object.assign([], selections)),
      where: [],
      group: new Set()
    };
    for (const transform of transforms) {
      if (isFilter(transform)) {
        if (typeof transform.filter === "string") {
          // naive conversion to SQL
          components.where.push(
            transform.filter.replace(/==/g, "=").replace(/datum\./g, "")
          );
        } else {
          // field predicates not supported
        }
      } else if (isAggregate(transform)) {
        for (const aggregate of transform.aggregate) {
          const translated_op = this.translate_op(aggregate.op);
          if (aggregate.field !== undefined) {
            components.select.add(
              `${translated_op}(${aggregate.field}) AS ${aggregate.as}`
            );
          } else {
            // must be a counting operation
            components.select.add(`${translated_op}(*) AS ${aggregate.as}`);
          }
        }
        if (transform.groupby !== undefined) {
          for (const group of transform.groupby) {
            components.group.add(group);
          }
        }
      }
    }
    for (const group of selections) {
      components.group.add(group);
    }
    return `SELECT ${Array.from(components.select).join(", ")} 
FROM ${table}${
      components.where.length > 0 ? "\nWHERE " : ""
    }${components.where.join(", ")}${
      components.group.size > 0 ? "\nGROUP BY " : ""
    }${Array.from(components.group).join(", ")}`;
  }

  private static translate_op(op: string): string {
    return this.agg_op_mappings[op] || op;
  }
}
