/** @babel */

describe("dev-dependencies", function () {
  it("should not have devDependencies by default", function () {
    const pkg = require("../../package.json");

    expect(pkg.devDependencies).toBeFalsy();
  });
});
