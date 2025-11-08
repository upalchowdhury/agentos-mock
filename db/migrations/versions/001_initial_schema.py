"""Initial schema for AgentOS Mock

Revision ID: 001
Revises:
Create Date: 2025-01-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create agent_registry table
    op.create_table('agent_registry',
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('org_id', sa.String(length=64), nullable=False),
        sa.Column('project_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('runtime_type', sa.String(length=32), nullable=False),
        sa.Column('protocol', sa.Enum('A2A', 'MCP', 'HTTP', 'GRPC', 'QUEUE', name='protocol'), nullable=False),
        sa.Column('health_status', sa.String(length=16), nullable=False),
        sa.Column('badges', sa.JSON(), nullable=True),
        sa.Column('last_health_check', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('agent_id')
    )
    op.create_index('idx_agent_org', 'agent_registry', ['org_id', 'project_id'], unique=False)

    # Create telemetry_traces table
    op.create_table('telemetry_traces',
        sa.Column('trace_id', sa.String(length=64), nullable=False),
        sa.Column('invocation_id', sa.String(length=64), nullable=False),
        sa.Column('org_id', sa.String(length=64), nullable=False),
        sa.Column('project_id', sa.String(length=64), nullable=False),
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('version_id', sa.String(length=64), nullable=False),
        sa.Column('protocol', sa.Enum('A2A', 'MCP', 'HTTP', 'GRPC', 'QUEUE', name='protocol'), nullable=False),
        sa.Column('run_mode', sa.String(length=32), nullable=False),
        sa.Column('config_hash', sa.String(length=64), nullable=True),
        sa.Column('signature_verified', sa.Boolean(), nullable=True),
        sa.Column('cost_cents', sa.Integer(), nullable=True),
        sa.Column('start_timestamp', sa.DateTime(), nullable=False),
        sa.Column('end_timestamp', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('trace_id')
    )
    op.create_index('idx_trace_agent', 'telemetry_traces', ['agent_id', 'start_timestamp'], unique=False)
    op.create_index('idx_trace_org_time', 'telemetry_traces', ['org_id', 'start_timestamp'], unique=False)
    op.create_index(op.f('ix_telemetry_traces_agent_id'), 'telemetry_traces', ['agent_id'], unique=False)
    op.create_index(op.f('ix_telemetry_traces_org_id'), 'telemetry_traces', ['org_id'], unique=False)
    op.create_index(op.f('ix_telemetry_traces_project_id'), 'telemetry_traces', ['project_id'], unique=False)

    # Create telemetry_spans table
    op.create_table('telemetry_spans',
        sa.Column('span_id', sa.String(length=64), nullable=False),
        sa.Column('trace_id', sa.String(length=64), nullable=False),
        sa.Column('parent_span_id', sa.String(length=64), nullable=True),
        sa.Column('kind', sa.Enum('PROMPT', 'TOOL', 'SUBAGENT', 'SYSTEM', 'NETWORK', name='spankind'), nullable=False),
        sa.Column('model_provider', sa.String(length=32), nullable=True),
        sa.Column('model_name', sa.String(length=64), nullable=True),
        sa.Column('model_params', sa.JSON(), nullable=True),
        sa.Column('tokens_in', sa.Integer(), nullable=True),
        sa.Column('tokens_out', sa.Integer(), nullable=True),
        sa.Column('excerpts', sa.Text(), nullable=True),
        sa.Column('policy_enforced', sa.JSON(), nullable=True),
        sa.Column('obligations', sa.JSON(), nullable=True),
        sa.Column('redaction_mask_ids', sa.JSON(), nullable=True),
        sa.Column('signature_verified', sa.Boolean(), nullable=True),
        sa.Column('status', sa.Enum('SUCCESS', 'ERROR', 'DENIED', name='spanstatus'), nullable=False),
        sa.Column('duration_ms', sa.Integer(), nullable=False),
        sa.Column('content_hash_in', sa.String(length=64), nullable=True),
        sa.Column('content_hash_out', sa.String(length=64), nullable=True),
        sa.Column('start_timestamp', sa.DateTime(), nullable=False),
        sa.Column('end_timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['parent_span_id'], ['telemetry_spans.span_id'], ),
        sa.ForeignKeyConstraint(['trace_id'], ['telemetry_traces.trace_id'], ),
        sa.PrimaryKeyConstraint('span_id')
    )
    op.create_index('idx_span_parent', 'telemetry_spans', ['parent_span_id'], unique=False)
    op.create_index('idx_span_trace', 'telemetry_spans', ['trace_id', 'start_timestamp'], unique=False)
    op.create_index(op.f('ix_telemetry_spans_trace_id'), 'telemetry_spans', ['trace_id'], unique=False)

    # Create telemetry_edges table
    op.create_table('telemetry_edges',
        sa.Column('edge_id', sa.String(length=64), nullable=False),
        sa.Column('trace_id', sa.String(length=64), nullable=False),
        sa.Column('from_agent_id', sa.String(length=64), nullable=False),
        sa.Column('from_agent_version', sa.String(length=64), nullable=False),
        sa.Column('to_agent_id', sa.String(length=64), nullable=False),
        sa.Column('to_agent_version', sa.String(length=64), nullable=False),
        sa.Column('from_span_id', sa.String(length=64), nullable=False),
        sa.Column('to_span_id', sa.String(length=64), nullable=False),
        sa.Column('channel', sa.Enum('A2A', 'MCP', 'HTTP', 'GRPC', 'QUEUE', name='protocol'), nullable=False),
        sa.Column('instruction_type', sa.String(length=64), nullable=True),
        sa.Column('signature_verified', sa.Boolean(), nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('content_hash', sa.String(length=64), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['from_span_id'], ['telemetry_spans.span_id'], ),
        sa.ForeignKeyConstraint(['to_span_id'], ['telemetry_spans.span_id'], ),
        sa.ForeignKeyConstraint(['trace_id'], ['telemetry_traces.trace_id'], ),
        sa.PrimaryKeyConstraint('edge_id')
    )
    op.create_index('idx_edge_from_agent', 'telemetry_edges', ['from_agent_id'], unique=False)
    op.create_index('idx_edge_to_agent', 'telemetry_edges', ['to_agent_id'], unique=False)
    op.create_index('idx_edge_trace', 'telemetry_edges', ['trace_id', 'timestamp'], unique=False)
    op.create_index(op.f('ix_telemetry_edges_trace_id'), 'telemetry_edges', ['trace_id'], unique=False)

    # Create telemetry_anomalies table
    op.create_table('telemetry_anomalies',
        sa.Column('anomaly_id', sa.String(length=64), nullable=False),
        sa.Column('trace_id', sa.String(length=64), nullable=False),
        sa.Column('span_id', sa.String(length=64), nullable=True),
        sa.Column('anomaly_type', sa.Enum('INJECTION_ATTEMPT', 'TOOL_ABUSE', 'SIGNATURE_FAILURE', 'BUDGET_EXCEEDED', name='anomalytype'), nullable=False),
        sa.Column('severity', sa.String(length=16), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['span_id'], ['telemetry_spans.span_id'], ),
        sa.ForeignKeyConstraint(['trace_id'], ['telemetry_traces.trace_id'], ),
        sa.PrimaryKeyConstraint('anomaly_id')
    )
    op.create_index('idx_anomaly_trace', 'telemetry_anomalies', ['trace_id', 'detected_at'], unique=False)
    op.create_index('idx_anomaly_type', 'telemetry_anomalies', ['anomaly_type', 'detected_at'], unique=False)
    op.create_index(op.f('ix_telemetry_anomalies_trace_id'), 'telemetry_anomalies', ['trace_id'], unique=False)

    # Create cost_aggregates table
    op.create_table('cost_aggregates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('org_id', sa.String(length=64), nullable=False),
        sa.Column('project_id', sa.String(length=64), nullable=True),
        sa.Column('agent_id', sa.String(length=64), nullable=True),
        sa.Column('provider', sa.String(length=32), nullable=True),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('total_cost_cents', sa.Integer(), nullable=True),
        sa.Column('total_tokens_in', sa.BigInteger(), nullable=True),
        sa.Column('total_tokens_out', sa.BigInteger(), nullable=True),
        sa.Column('invocation_count', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_cost_agent_date', 'cost_aggregates', ['agent_id', 'date'], unique=False)
    op.create_index('idx_cost_org_date', 'cost_aggregates', ['org_id', 'date'], unique=False)
    op.create_index(op.f('ix_cost_aggregates_agent_id'), 'cost_aggregates', ['agent_id'], unique=False)
    op.create_index(op.f('ix_cost_aggregates_date'), 'cost_aggregates', ['date'], unique=False)
    op.create_index(op.f('ix_cost_aggregates_org_id'), 'cost_aggregates', ['org_id'], unique=False)
    op.create_index(op.f('ix_cost_aggregates_project_id'), 'cost_aggregates', ['project_id'], unique=False)

    # Create policy_audit table
    op.create_table('policy_audit',
        sa.Column('audit_id', sa.String(length=64), nullable=False),
        sa.Column('trace_id', sa.String(length=64), nullable=True),
        sa.Column('policy_ids', sa.JSON(), nullable=False),
        sa.Column('decision', sa.String(length=16), nullable=False),
        sa.Column('obligations', sa.JSON(), nullable=True),
        sa.Column('decision_json', sa.JSON(), nullable=True),
        sa.Column('evaluated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['trace_id'], ['telemetry_traces.trace_id'], ),
        sa.PrimaryKeyConstraint('audit_id')
    )
    op.create_index('idx_audit_decision', 'policy_audit', ['decision', 'evaluated_at'], unique=False)
    op.create_index('idx_audit_trace', 'policy_audit', ['trace_id', 'evaluated_at'], unique=False)
    op.create_index(op.f('ix_policy_audit_evaluated_at'), 'policy_audit', ['evaluated_at'], unique=False)
    op.create_index(op.f('ix_policy_audit_trace_id'), 'policy_audit', ['trace_id'], unique=False)


def downgrade() -> None:
    op.drop_table('policy_audit')
    op.drop_table('cost_aggregates')
    op.drop_table('telemetry_anomalies')
    op.drop_table('telemetry_edges')
    op.drop_table('telemetry_spans')
    op.drop_table('telemetry_traces')
    op.drop_table('agent_registry')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS anomalytype')
    op.execute('DROP TYPE IF EXISTS spanstatus')
    op.execute('DROP TYPE IF EXISTS spankind')
    op.execute('DROP TYPE IF EXISTS protocol')
