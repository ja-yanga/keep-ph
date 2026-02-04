"use client";

import React, { useState, memo } from "react";
import {
  Stack,
  Group,
  Text,
  Button,
  Grid,
  UnstyledButton,
  Loader,
  Center,
  Modal,
} from "@mantine/core";
import { IconX, IconUserCheck } from "@tabler/icons-react";
import Image from "next/image";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";
import { normalizeImageUrl } from "@/utils/helper";
import { KycTableRow } from "@/utils/types";

type KycDetailsProps = {
  selected: KycTableRow | null;
  processing: boolean;
  onVerify: (r: KycTableRow, status: "VERIFIED" | "REJECTED") => Promise<void>;
  onClose: () => void;
};

const DetailStack = memo(
  ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Stack gap={2} mt="md">
      <Text fw={700} size="sm">
        {label}
      </Text>
      {children}
    </Stack>
  ),
);
DetailStack.displayName = "DetailStack";

function formatAddress(address?: KycTableRow["address"]): React.ReactNode {
  if (!address) return <Text c="gray.8">—</Text>;

  const parts = [];
  if (address.user_address_line1) parts.push(address.user_address_line1);
  if (address.user_address_line2) parts.push(address.user_address_line2);

  const cityProvinceRegionPostal = [
    address.user_address_barangay,
    address.user_address_city,
    address.user_address_province,
    address.user_address_region,
    address.user_address_postal,
  ]
    .filter(Boolean)
    .join(", ");

  if (cityProvinceRegionPostal) parts.push(cityProvinceRegionPostal);

  if (parts.length === 0) return <Text c="gray.9">—</Text>;

  return (
    <Stack gap={0}>
      {parts.map((part, index) => (
        <Text key={index} size="sm">
          {part}
        </Text>
      ))}
    </Stack>
  );
}

const KycDetails = ({
  selected,
  processing,
  onVerify,
  onClose,
}: KycDetailsProps) => {
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [zoomOpen, { open: openZoom, close: closeZoom }] = useDisclosure(false);

  if (!selected) {
    return (
      <Center mih={300}>
        <Loader />
      </Center>
    );
  }

  const fullName = `${selected.user_kyc_first_name ?? ""} ${selected.user_kyc_last_name ?? ""}`;

  return (
    <>
      <Stack>
        <Grid>
          <Grid.Col span={6}>
            <DetailStack label="Name">
              <Text size="sm" fw={500}>
                {fullName}
              </Text>
            </DetailStack>

            <DetailStack label="Document ID Number">
              <Text size="sm" fw={500}>
                {selected.user_kyc_id_number ?? "—"}
              </Text>
            </DetailStack>

            <DetailStack label="Document Type">
              <Text size="sm" fw={500}>
                {selected.user_kyc_id_document_type ?? "—"}
              </Text>
            </DetailStack>
          </Grid.Col>

          <Grid.Col span={6}>
            <DetailStack label="Address">
              {formatAddress(selected.address)}
            </DetailStack>

            <DetailStack label="Timestamps">
              <Text size="sm">
                Submitted:{" "}
                <Text span fw={500}>
                  {selected.user_kyc_submitted_at
                    ? dayjs(selected.user_kyc_submitted_at).format(
                        "MMM D, YYYY hh:mm A",
                      )
                    : "—"}
                </Text>
              </Text>
              <Text size="sm">
                Verified:{" "}
                <Text span fw={500}>
                  {selected.user_kyc_verified_at
                    ? dayjs(selected.user_kyc_verified_at).format(
                        "MMM D, YYYY hh:mm A",
                      )
                    : "—"}
                </Text>
              </Text>
            </DetailStack>
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={6}>
            <DetailStack label="ID Front">
              {selected.user_kyc_id_front_url ? (
                <div>
                  <Text size="xs" c="gray.9">
                    Front
                  </Text>
                  {(() => {
                    const src = normalizeImageUrl(
                      selected.user_kyc_id_front_url,
                    );
                    return src ? (
                      <UnstyledButton
                        aria-label="Enlarge front ID image"
                        style={{
                          position: "relative",
                          width: "100%",
                          aspectRatio: "1.5",
                          cursor: "zoom-in",
                          display: "block",
                        }}
                        onClick={() => {
                          setModalImageSrc(src);
                          openZoom();
                        }}
                      >
                        <Image
                          src={src}
                          alt="ID card front view"
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          style={{
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      </UnstyledButton>
                    ) : (
                      <Text size="xs" c="gray.8">
                        Image unavailable
                      </Text>
                    );
                  })()}
                </div>
              ) : (
                <Text size="xs" c="gray.8">
                  —
                </Text>
              )}
            </DetailStack>
          </Grid.Col>

          <Grid.Col span={6}>
            <DetailStack label="ID Back">
              {selected.user_kyc_id_back_url ? (
                <div>
                  <Text size="xs" c="gray.9">
                    Back
                  </Text>
                  {(() => {
                    const src = normalizeImageUrl(
                      selected.user_kyc_id_back_url,
                    );
                    return src ? (
                      <UnstyledButton
                        aria-label="Enlarge back ID image"
                        style={{
                          position: "relative",
                          width: "100%",
                          aspectRatio: "1.5",
                          cursor: "zoom-in",
                          display: "block",
                        }}
                        onClick={() => {
                          setModalImageSrc(src);
                          openZoom();
                        }}
                      >
                        <Image
                          src={src}
                          alt="ID card back view"
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          style={{
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      </UnstyledButton>
                    ) : (
                      <Text size="xs" c="gray.8">
                        Image unavailable
                      </Text>
                    );
                  })()}
                </div>
              ) : (
                <Text size="xs" c="gray.8">
                  —
                </Text>
              )}
            </DetailStack>
          </Grid.Col>
        </Grid>

        <Group justify="flex-end" mt="xl">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          {selected.user_kyc_status === "SUBMITTED" && (
            <Button
              color="red.9"
              variant="filled"
              onClick={() => onVerify(selected, "REJECTED")}
              loading={processing}
              leftSection={<IconX size={16} />}
            >
              Reject
            </Button>
          )}

          {selected.user_kyc_status !== "VERIFIED" && (
            <Button
              color="green.9"
              variant="filled"
              onClick={() => onVerify(selected, "VERIFIED")}
              loading={processing}
              leftSection={<IconUserCheck size={16} />}
            >
              Mark Verified
            </Button>
          )}
        </Group>
      </Stack>

      <Modal opened={zoomOpen} onClose={closeZoom} size="lg" centered>
        {modalImageSrc && (
          <div style={{ position: "relative", width: "100%", height: "70vh" }}>
            <Image
              src={modalImageSrc}
              alt="Enlarged ID card preview"
              fill
              sizes="90vw"
              style={{ objectFit: "contain" }}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default memo(KycDetails);
