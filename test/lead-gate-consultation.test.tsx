import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeadGateScreen } from "@/components/screens/LeadGateScreen";
import { useWizard } from "@/store/wizard-store";
import { sampleResult } from "./fixtures";
import { ClinicLocationProvider } from "@/components/clinic/ClinicLocationContext";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(), report: vi.fn(), analysis: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  submitLead: mocks.submit, submitReportToGhl: mocks.report,
  requestAnalysis: mocks.analysis,
}));
vi.mock("@/lib/meta-pixel", () => ({ getMetaAttribution: () => ({}) }));
vi.mock("@/lib/meta-consent", () => ({ hasMetaTrackingConsent: () => false }));

beforeEach(() => {
  vi.clearAllMocks();
  useWizard.getState().reset();
  useWizard.getState().setResult(sampleResult);
  useWizard.getState().setAgeConfirmed(true);
  useWizard.getState().setFillerHistory("yes_unhappy");
  useWizard.getState().setPriority("fix_previous");
  useWizard.getState().goToLead();
  mocks.submit.mockResolvedValue(undefined);
  mocks.report.mockResolvedValue(undefined);
});
afterEach(cleanup);

function fillLead(location: "london" | "glasgow" = "london") {
  render(<ClinicLocationProvider location={location}><LeadGateScreen /></ClinicLocationProvider>);
  for (const [label, value] of [
    ["First name", "Test"], ["Last name", "Preview"],
    ["Email", "test@example.test"], ["Best number for your consultation call", "07700900123"],
  ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  return screen.getByRole("button", { name: "See my report" });
}

describe("consultation call request", () => {
  it("sends the consent wording, time and preferred call time with the lead", async () => {
    useWizard.getState().setContactConsent(true);
    const button = fillLead("glasgow");
    expect(screen.getByText(/will call you within minutes/)).toBeInTheDocument();
    expect(screen.queryByText(/0141 488 8985|020 4628 3165/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Afternoon" }));
    fireEvent.click(button);
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
      clinicLocation: "glasgow",
      consultationContactConsent: true,
      consultationContactConsentAt: expect.stringMatching(/^\d{4}-/),
      consultationContactStatement: expect.stringContaining("call, text or WhatsApp me"),
      consultationContactConsentVersion: "consultation-contact-v1",
      preferredCallTime: "afternoon",
      ageConfirmed: true,
      fillerHistory: "yes_unhappy",
      priority: "fix_previous",
    }));
    expect(useWizard.getState().step).toBe("result");
  });

  it("never produces a report without a real scan result", async () => {
    useWizard.getState().setContactConsent(true);
    useWizard.setState({ result: null });
    const button = fillLead("london");
    fireEvent.click(button);
    await waitFor(() => expect(useWizard.getState().step).toBe("scanfailed"));
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.analysis).not.toHaveBeenCalled();
  });

  it("shows no phone number and leaves the call time out when none is picked", async () => {
    useWizard.getState().setContactConsent(true);
    const button = fillLead("london");
    expect(screen.getByText(/will call you within minutes/)).toBeInTheDocument();
    expect(screen.queryByText(/0141 488 8985|020 4628 3165/)).toBeNull();
    fireEvent.click(button);
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit.mock.calls[0][0]).not.toHaveProperty("preferredCallTime");
  });
});

describe("clinic chooser", () => {
  it("starts the shared home page without a city, then routes the lead to the chosen clinic", async () => {
    const { ClinicChooser } = await import("@/components/clinic/ClinicChooser");
    const { HeroScreen } = await import("@/components/screens/HeroScreen");
    window.matchMedia ??= ((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    useWizard.getState().reset();
    render(<ClinicLocationProvider><HeroScreen /></ClinicLocationProvider>);
    expect(screen.getByText("Still you.")).toBeInTheDocument();
    expect(screen.getByText(/only\s+GMC-registered doctors inject/)).toBeInTheDocument();
    cleanup();

    useWizard.getState().setResult(sampleResult);
    useWizard.getState().setAgeConfirmed(true);
    useWizard.getState().setFillerHistory("no");
    useWizard.getState().setPriority("not_sure");
    useWizard.getState().goToLead();
    render(
      <ClinicLocationProvider>
        <ClinicChooser />
        <LeadGateScreen />
      </ClinicLocationProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Glasgow" }));
    expect(screen.getByText(/Our Glasgow team will call you/)).toBeInTheDocument();
    for (const [label, value] of [
      ["First name", "Test"], ["Last name", "Preview"],
      ["Email", "test@example.test"], ["Best number for your consultation call", "07700900123"],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "See my report" }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(
      expect.objectContaining({ clinicLocation: "glasgow" }),
    ));
  });
});
