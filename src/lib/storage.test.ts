import { describe, it, expect } from "vitest";
import { sigv4Sign } from "./storage";

// Test vector ufficiale AWS SigV4 ("get-vanilla" della suite aws-sig-v4-test-suite):
// credenziali di esempio documentate da AWS. Verifica che la nostra firma sia
// bit-per-bit corretta senza dipendere dall'SDK.
// Rif: https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
describe("sigv4Sign — AWS test vector (get-vanilla)", () => {
  const res = sigv4Sign({
    method: "GET",
    canonicalPath: "/",
    region: "us-east-1",
    service: "service",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    headers: {
      host: "example.amazonaws.com",
      "x-amz-date": "20150830T123600Z",
    },
    payloadHash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // sha256("")
    amzDate: "20150830T123600Z",
  });

  it("produce la signature attesa dal vettore AWS", () => {
    expect(res.signature).toBe(
      "5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
  });

  it("costruisce lo scope e i signed headers corretti", () => {
    expect(res.credentialScope).toBe("20150830/us-east-1/service/aws4_request");
    expect(res.signedHeaders).toBe("host;x-amz-date");
  });

  it("compone l'header Authorization completo", () => {
    expect(res.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
        "SignedHeaders=host;x-amz-date, " +
        "Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
  });
});
