import { describe, it, expect, beforeEach } from "vitest";
import { useWizard } from "@/store/wizard-store";
import type { AnalyzeResult, Lead } from "@/lib/types";
import { sampleResult } from "./fixtures";

const s = () => useWizard.getState();

const lead: Lead = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "07700900123",
};

const result: AnalyzeResult = sampleResult;

beforeEach(() => s().reset());

function ready() {
  s().setImageConsent(true);
  s().setContactConsent(true);
  s().setAgeConfirmed(true);
  s().setFillerHistory("yes_happy");
  s().setPriority("subtle_definition");
  s().setImage("b64", "image/jpeg");
}

describe("wizard-store transitions", () => {
  it("starts at the hero", () => {
    expect(s().step).toBe("hero");
  });

  it("start() advances to consent", () => {
    s().start();
    expect(s().step).toBe("consent");
  });

  it("beginScan() requires consent and an image", () => {
    s().start();
    s().beginScan();
    expect(s().step).toBe("consent"); // blocked: no consent/image

    s().setImageConsent(true);
    expect(s().imageConsentAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    s().setImage("b64", "image/jpeg");
    s().beginScan();
    expect(s().step).toBe("consent"); // blocked: no consultation request yet

    s().setContactConsent(true);
    expect(s().contactConsentAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    s().beginScan();
    expect(s().step).toBe("consent"); // blocked: questions + 18+ not answered

    s().setFillerHistory("not_sure");
    s().setPriority("less_tired");
    s().beginScan();
    expect(s().step).toBe("consent"); // blocked: 18+ not confirmed

    s().setAgeConfirmed(true);
    s().beginScan();
    expect(s().step).toBe("scan");
  });

  it("a failed scan keeps answers, consents and lead, and retry re-runs with the same photo", () => {
    ready();
    s().beginScan();
    s().setLead(lead);
    s().failScan("scan_unavailable");
    expect(s().step).toBe("scanfailed");
    expect(s().result).toBeNull();
    expect(s().scanFailure).toBe("scan_unavailable");
    expect(s().lead).toEqual(lead);
    expect(s().fillerHistory).toBe("yes_happy");
    expect(s().contactConsent).toBe(true);
    s().retryScan();
    expect(s().step).toBe("scan");
    expect(s().imageBase64).toBe("b64");
    s().failScan("no_face");
    s().retakePhoto();
    expect(s().step).toBe("consent");
    expect(s().imageBase64).toBeNull();
    expect(s().lead).toEqual(lead);
    expect(s().ageConfirmed).toBe(true);
  });

  it("completeScan() moves from scan straight to the lead gate", () => {
    ready();
    s().beginScan();
    s().completeScan();
    expect(s().step).toBe("lead");
  });
});

describe("wizard-store result gating", () => {
  it("reveal() is blocked until a lead is captured, even once the result exists", () => {
    s().setResult(result);
    s().reveal();
    expect(s().step).not.toBe("result");
  });

  it("reveal() is blocked until the result exists, even once a lead is captured", () => {
    s().setLead(lead);
    s().reveal();
    expect(s().step).not.toBe("result");
  });

  it("reveal() unlocks the result once both lead and result exist, retaining the image for the report", () => {
    s().setImage("b64", "image/jpeg");
    s().setResult(result);
    s().setLead(lead);
    s().reveal();
    expect(s().step).toBe("result");
    expect(s().result).toEqual(result);
    expect(s().imageBase64).toBe("b64");
  });

  it("reset() drops the retained selfie and landmarks", () => {
    s().setImage("b64", "image/jpeg");
    s().setLandmarks([{ x: 0.5, y: 0.5, z: 0 }]);
    s().reset();
    expect(s().imageBase64).toBeNull();
    expect(s().landmarks).toBeNull();
  });
});

describe("wizard-store reset", () => {
  it("reset() returns to the initial state", () => {
    s().setImageConsent(true);
    s().setImage("b64", "image/jpeg");
    s().setLead(lead);
    s().reset();
    expect(s().step).toBe("hero");
    expect(s().imageBase64).toBeNull();
    expect(s().lead).toBeNull();
    expect(s().imageConsent).toBe(false);
    expect(s().imageConsentAt).toBeNull();
  });
});
