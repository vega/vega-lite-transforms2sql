import "@mapd/connector/dist/browser-connector";
import { Transforms2SQL } from "./transforms2sql";
import {
  NormalizedUnitSpec,
  extractTransforms,
  selectedFields
} from "vega-lite/build/src/spec";
import { defaultConfig } from "vega-lite/build/src/config";
import embed from "vega-embed";

// connect to MapD server; start session
const connection = new (window as any).MapdCon()
  .protocol("https")
  .host("metis.mapd.com")
  .port("443")
  .dbName("mapd")
  .user("mapd")
  .password("HyperInteractive");

const session = connection.connectAsync();

const table = "flights_donotmodify";

const vlHeatmap: NormalizedUnitSpec = {
  title: "Average Daily Flight Departure Delay",
  mark: "rect",
  encoding: {
    x: { field: "flight_dayofmonth", type: "ordinal", title: "day" },
    y: { field: "flight_month", type: "ordinal", title: "month" },
    color: {
      aggregate: "average",
      field: "depdelay",
      type: "quantitative",
      title: "average delay"
    }
  }
};

const vlBarchart: NormalizedUnitSpec = {
  title: "Number of Flights by Airline",
  mark: "bar",
  encoding: {
    x: { field: "carrier_name", type: "ordinal", title: "Airline" },
    y: { aggregate: "count", type: "quantitative", title: "Number of Flights" }
  }
};

function loadDemo(containerName: string, spec: NormalizedUnitSpec): void {
  const container = document.getElementById(containerName + "-container");
  // Insert original vega spec
  const ogSpecContainer = <HTMLDivElement>document.createElement("div");
  const ogSpecCode = <HTMLElement>document.createElement("pre");
  ogSpecCode.classList.add("prettyprint");
  ogSpecCode.innerHTML = JSON.stringify(spec, null, 4);

  ogSpecContainer.innerHTML = "<h3>Original Specification</h3>";
  ogSpecContainer.appendChild(ogSpecCode);
  container.appendChild(ogSpecContainer);

  // Insert modified vega spec
  const modifiedSpec = extractTransforms(spec, defaultConfig);

  const modifiedSpecContainer = <HTMLDivElement>document.createElement("div");
  const modifiedSpecCode = <HTMLElement>document.createElement("pre");
  modifiedSpecCode.classList.add("prettyprint");
  modifiedSpecCode.innerHTML = JSON.stringify(modifiedSpec, null, 4);

  modifiedSpecContainer.innerHTML =
    "<h3>Specification w/ Extracted Transforms</h3>";
  modifiedSpecContainer.appendChild(modifiedSpecCode);
  container.appendChild(modifiedSpecContainer);

  // Insert transformation SQL
  const transforms = modifiedSpec.transform;
  const selects = selectedFields(spec);
  selects.splice(selects.length - 1, 1);
  delete modifiedSpec.transform;
  const sql = Transforms2SQL.convert(table, selects, transforms);

  const sqlContainer = <HTMLDivElement>document.createElement("div");
  const sqlCode = <HTMLElement>document.createElement("pre");
  sqlCode.classList.add("prettyprint");
  sqlCode.innerHTML = sql;

  sqlContainer.innerHTML = "<h3>Transforms as SQL</h3>";
  sqlContainer.appendChild(sqlCode);
  container.appendChild(sqlContainer);

  // Insert visualization
  session.then(s => {
    s.queryAsync(sql).then(values => {
      // load visualization
      embed(
        "#" + containerName + "-viz",
        Object.assign({ data: { values } }, modifiedSpec),
        { defaultStyle: true }
      );
    });
  });
}

loadDemo("barchart", vlBarchart);
loadDemo("heatmap", vlHeatmap);
