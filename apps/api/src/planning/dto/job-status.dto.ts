import { ApiProperty } from '@nestjs/swagger';

export class JobStatusDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: ['queued', 'running', 'completed', 'failed'] })
  status!: string;

  @ApiProperty()
  progressPercent!: number;

  @ApiProperty({ nullable: true })
  planId!: string | null;

  @ApiProperty({ nullable: true })
  error!: string | null;

  @ApiProperty({ type: String, nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  finishedAt!: Date | null;
}
