import {
  createHash,
  randomBytes,
} from "crypto";

export const CANDIDATE_INVITE_HOURS = 48;

export function generateCandidateInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCandidateInviteToken(
  token: string
) {
  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

export function candidateInviteExpiration() {
  return new Date(
    Date.now() +
      CANDIDATE_INVITE_HOURS *
        60 *
        60 *
        1000
  );
}
