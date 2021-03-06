/** @babel */
/** @jsx etch.dom */

import etch from "etch";

/* eslint-disable no-unused-vars */
import TimerView from "./timer-view";
import ResultsView from "./results-view";
/* eslint-enable no-unused-vars */

const defaultProps = {
	title: "",
	specs: {},
	startedAt: null,
	endedAt: null,
	currentSpec: null,
	topSuite: null,
	pausedAt: false,
	pausing: false,
	timePaused: 0,
};

export default class J3ReporterView {
	constructor(props) {

		this.props = { ...defaultProps, ...props };

		etch.initialize(this);
	}

	update(props) {
		this.props = { ...this.props, ...props };

		return etch.update(this);
	}

	destroy() {
		return etch.destroy(this);
	}

	onResume(func) {
		this.resumeFunc = func;
		this.update({
			restarting: false,
			pausing: false,
			pausedAt: Date.now()
		});
	}

	onResumeClick() {
		if (this.isPaused()) {
			this.update({
				pausing: false,
				pausedAt: false,
				timePaused: this.props.timePaused + (this.props.pausedAt ? Date.now() - this.props.pausedAt : 0)
			});
			if (this.resumeFunc) {
				const done = this.resumeFunc;
				this.resumeFunc = null;
				done();
			}
		}
	}

	isPaused() {
		return this.props.restarting || this.props.pausing || !!this.props.pausedAt;
	}

	onPauseClick() {
		if (!this.isPaused()) {
			this.update({ pausing: true });
		}
	}

	onReloadClick() {
		this.update({ restarting: true });
		atom.reload();
	}

	onSymbolClick(spec) {
		return function () {
			const failure = document.querySelector(`#spec-failure-${spec.id}`);
			if (failure) {
				failure.scrollIntoView();
			}
		};
	}

	renderSymbol(spec) {
		let status = "pending";
		if (spec.startedAt) {
			status = "started";
			if (spec.endedAt) {
				switch (spec.result.status) {
					case "failed":
						status = "failed";
						break;
					case "passed":
						status = "passed";
						break;
					case "pending":
					case "disabled":
					default:
						status = "skipped";
				}
			}
		}

		return (
			<li title={spec.title} className={`spec-summary ${status}`} on={{ click: this.onSymbolClick(spec) }}></li>
		);
	}

	getResults(children) {
		const results = [];

		for (const child of children) {

			if (!child.children && (!child.endedAt || child.result.status === "pending")) {
				// spec has not finished running
				continue;
			}

			const result = {
				id: child.id,
				specDirectory: child.specDirectory,
				description: child.description,
				deprecationWarnings: child.result.deprecationWarnings || [],
				failedExpectations: child.result.failedExpectations || [],
				passedExpectations: child.result.passedExpectations || [],
				shouldFail: child.shouldFail,
				status: child.result.status,
			};
			if (child.children) {
				result.children = this.getResults(child.children);
			}

			const showReasons = [
				result.deprecationWarnings.length > 0,
				result.failedExpectations.length > 0,
				result.children && result.children.length > 0,
				result.shouldFail && result.passedExpectations.length > 0,
			];

			const shouldShow = showReasons.reduce(function (show, reason) {
				return show || reason;
			}, false);

			if (shouldShow) {
				results.push(result);
			}
		}

		return results;
	}

	render() {
		let completeSpecCount = 0;
		let skippedCount = 0;
		let totalSpecCount = 0;
		let failureCount = 0;

		const specSymbols = [];

		for (const id in this.props.specs) {
			const spec = this.props.specs[id];

			totalSpecCount++;

			if (spec.startedAt) {
				if (spec.endedAt) {
					completeSpecCount++;
					switch (spec.result.status) {
						case "failed":
							failureCount++;
							break;
						case "passed":
							break;
						case "pending":
						case "disabled":
						default:
							skippedCount++;
					}
				}
			}

			specSymbols.push(this.renderSymbol(spec));
		}

		const results = this.getResults([this.props.topSuite]);

		let statusMessage = " ";
		if (this.props.endedAt) {
			const s = (failureCount === 1 ? "" : "s");
			statusMessage = `${failureCount} failure${s}`;
		} else if (this.props.currentSpec) {
			if (this.props.currentSpec.suites.length > 0) {
				statusMessage = this.props.currentSpec.suites[0].description;
			} else {
				statusMessage = this.props.currentSpec.description.replace(/^it /, "");
			}
		}

		let statusClass = "alert-info";
		if (failureCount > 0) {
			statusClass = "alert-danger";
		} else if (this.props.endedAt) {
			statusClass = "alert-success";
		}

		return (
			<div className="j3-spec-reporter-container">
				<div className="spec-reporter">
					<div className="spec-buttons padded pull-right">
						<button className={`btn btn-small resume-button ${!this.props.endedAt && this.props.pausedAt ? "" : "hidden"}`} on={{ click: this.onResumeClick }}>Resume</button>
						<button className={`btn btn-small pausing-button ${!this.props.endedAt && this.props.pausing ? "" : "hidden"}`} on={{ click: this.onResumeClick }}>Pausing...</button>
						<button className={`btn btn-small pause-button ${!this.props.endedAt && !this.props.pausedAt && !this.props.pausing ? "" : "hidden"}`} on={{ click: this.onPauseClick }}>Pause</button>
						<button className="btn btn-small reload-button" on={{ click: this.onReloadClick }}>Reload Specs</button>
					</div>
					<div className="symbol-area">
						<div className="symbol-header">
							{this.props.title} Specs
						</div>
						<ul className="symbol-summary list-unstyled">
							{specSymbols}
						</ul>
					</div>
					<div className={`status alert ${statusClass}`}>
						<TimerView startedAt={this.props.startedAt} endedAt={this.props.endedAt} paused={this.props.restarting || !!this.props.pausedAt} timePaused={this.props.timePaused} />
						<div className="spec-count">
							{
								skippedCount > 0 ?
									`${completeSpecCount - skippedCount}/${totalSpecCount - skippedCount} (${skippedCount} skipped)` :
									`${completeSpecCount}/${totalSpecCount}`
							}
						</div>
						<div className="message">
							{statusMessage}
						</div>
					</div>
					<ResultsView results={results} />
				</div>
			</div>
		);
	}
}
