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

export type KycRow = {
  id: string;
  user_id: string;
  status: "SUBMITTED" | "VERIFIED" | "UNVERIFIED" | "REJECTED" | string;
  id_document_type?: string | null;
  id_number?: string | null;
  id_front_url?: string | null;
  id_back_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  address?: {
    line1?: string;
    line2?: string | null;
    city?: string;
    province?: string;
    region?: string;
    barangay?: string;
    postal?: string;
  } | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type KycDetailsProps = {
  selected: KycRow | null;
  processing: boolean;
  onVerify: (r: KycRow, status: "VERIFIED" | "REJECTED") => Promise<void>;
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

function formatAddress(address?: KycRow["address"]): React.ReactNode {
  if (!address) return <Text c="gray.8">—</Text>;

  const parts = [];
  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);

  const cityProvinceRegionPostal = [
    address.barangay,
    address.city,
    address.province,
    address.region,
    address.postal,
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

  const fullName =
    selected.full_name ??
    `${selected.first_name ?? ""} ${selected.last_name ?? ""}`;

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
                {selected.id_number ?? "—"}
              </Text>
            </DetailStack>

            <DetailStack label="Document Type">
              <Text size="sm" fw={500}>
                {selected.id_document_type ?? "—"}
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
                  {selected.submitted_at
                    ? dayjs(selected.submitted_at).format("MMM D, YYYY hh:mm A")
                    : "—"}
                </Text>
              </Text>
              <Text size="sm">
                Verified:{" "}
                <Text span fw={500}>
                  {selected.verified_at
                    ? dayjs(selected.verified_at).format("MMM D, YYYY hh:mm A")
                    : "—"}
                </Text>
              </Text>
            </DetailStack>
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={6}>
            <DetailStack label="ID Front">
              {selected.id_front_url ? (
                <div>
                  <Text size="xs" c="gray.9">
                    Front
                  </Text>
                  {(() => {
                    const src = normalizeImageUrl(selected.id_front_url);
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
              {selected.id_back_url ? (
                <div>
                  <Text size="xs" c="gray.9">
                    Back
                  </Text>
                  {(() => {
                    const src = normalizeImageUrl(selected.id_back_url);
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

          {selected.status === "SUBMITTED" && (
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

          {selected.status !== "VERIFIED" && (
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
